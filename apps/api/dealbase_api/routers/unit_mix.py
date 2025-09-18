"""Unit Mix Summary router with provenance tracking and linking controls."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
import logging

from ..database import get_session
from ..models import Deal, UnitMixSummary, RentRollNormalized

logger = logging.getLogger(__name__)

router = APIRouter()


class UnitMixRowCreate(BaseModel):
    """Schema for creating a unit mix row."""
    unit_type: str
    unit_label: Optional[str] = None
    total_units: int
    occupied_units: int
    avg_square_feet: Optional[int] = None
    avg_bedrooms: Optional[float] = None
    avg_bathrooms: Optional[float] = None
    avg_actual_rent: Decimal
    avg_market_rent: Decimal
    pro_forma_rent: Optional[Decimal] = None
    rent_growth_rate: Optional[Decimal] = None


class UnitMixRowUpdate(BaseModel):
    """Schema for updating a unit mix row."""
    unit_type: Optional[str] = None
    unit_label: Optional[str] = None
    total_units: Optional[int] = None
    occupied_units: Optional[int] = None
    avg_square_feet: Optional[int] = None
    avg_bedrooms: Optional[float] = None
    avg_bathrooms: Optional[float] = None
    avg_actual_rent: Optional[Decimal] = None
    avg_market_rent: Optional[Decimal] = None
    pro_forma_rent: Optional[Decimal] = None
    rent_growth_rate: Optional[Decimal] = None


class LinkRequest(BaseModel):
    """Schema for linking to a specific rent roll."""
    rrId: int


class UnitMixResponse(BaseModel):
    """Response schema for unit mix data."""
    deal_id: int
    provenance: str
    is_linked_to_nrr: bool
    rent_roll_name: Optional[str] = None
    last_derived_at: Optional[str] = None
    last_manual_edit_at: Optional[str] = None
    unit_mix: List[dict]
    totals: dict


def derive_unit_mix_from_nrr(deal_id: int, session: Session, rent_roll_name: Optional[str] = None) -> List[UnitMixSummary]:
    """Derive unit mix summary from normalized rent roll data."""
    # Get normalized rent roll data
    rent_roll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    if not rent_roll_data:
        raise HTTPException(status_code=404, detail="No normalized rent roll data found")
    
    # Group units by type
    units_by_type = {}
    for unit in rent_roll_data:
        unit_type = unit.unit_type
        if unit_type not in units_by_type:
            units_by_type[unit_type] = []
        units_by_type[unit_type].append(unit)
    
    # Clear existing unit mix data for this deal
    existing_ums = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    for ums in existing_ums:
        session.delete(ums)
    
    # Create new unit mix summaries
    unit_mix_rows = []
    current_time = datetime.utcnow()
    
    for unit_type, units in units_by_type.items():
        # Calculate aggregated metrics
        total_units = len(units)
        occupied_units = len([u for u in units if u.lease_status.lower() == "occupied"])
        vacant_units = total_units - occupied_units
        
        # Calculate averages
        square_feet_values = [u.square_feet for u in units if u.square_feet is not None]
        avg_square_feet = int(sum(square_feet_values) / len(square_feet_values)) if square_feet_values else None
        
        bedroom_values = [u.bedrooms for u in units if u.bedrooms is not None]
        avg_bedrooms = sum(bedroom_values) / len(bedroom_values) if bedroom_values else None
        
        bathroom_values = [u.bathrooms for u in units if u.bathrooms is not None]
        avg_bathrooms = sum(bathroom_values) / len(bathroom_values) if bathroom_values else None
        
        # Calculate rent metrics
        actual_rents = [float(u.actual_rent) for u in units if u.actual_rent > 0]
        market_rents = [float(u.market_rent) for u in units if u.market_rent > 0]
        
        avg_actual_rent = Decimal(str(sum(actual_rents) / len(actual_rents))) if actual_rents else Decimal("0")
        avg_market_rent = Decimal(str(sum(market_rents) / len(market_rents))) if market_rents else Decimal("0")
        
        # Calculate rent premium
        rent_premium = avg_actual_rent - avg_market_rent if avg_market_rent > 0 else Decimal("0")
        
        # Calculate totals
        total_square_feet = sum(square_feet_values) if square_feet_values else None
        total_actual_rent = avg_actual_rent * total_units
        total_market_rent = avg_market_rent * total_units
        total_pro_forma_rent = total_actual_rent  # Default to actual rent
        
        # Get unit label from first unit
        unit_label = units[0].unit_label if units and units[0].unit_label else None
        
        # Create unit mix summary row
        ums = UnitMixSummary(
            deal_id=deal_id,
            unit_type=unit_type,
            unit_label=unit_label,
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            avg_square_feet=avg_square_feet,
            avg_bedrooms=avg_bedrooms,
            avg_bathrooms=avg_bathrooms,
            avg_actual_rent=avg_actual_rent,
            avg_market_rent=avg_market_rent,
            rent_premium=rent_premium,
            total_square_feet=total_square_feet,
            total_actual_rent=total_actual_rent,
            total_market_rent=total_market_rent,
            total_pro_forma_rent=total_pro_forma_rent,
            provenance="NRR",
            is_linked_to_nrr=True,
            rent_roll_name=rent_roll_name,
            last_derived_at=current_time,
            created_at=current_time,
            updated_at=current_time
        )
        
        session.add(ums)
        unit_mix_rows.append(ums)
    
    session.commit()
    return unit_mix_rows


def get_unit_mix_by_floor_plan(deal_id: int, session: Session) -> UnitMixResponse:
    """Get unit mix data grouped by square footage and unit label (floor plan)."""
    # Get normalized rent roll data
    rent_roll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    if not rent_roll_data:
        return UnitMixResponse(
            deal_id=deal_id,
            provenance="MANUAL",
            is_linked_to_nrr=False,
            unit_mix=[],
            totals={
                "total_units": 0,
                "total_occupied": 0,
                "total_actual_rent": 0.0,
                "total_market_rent": 0.0
            }
        )
    
    # Group units by square footage only (for SqFt view)
    units_by_sqft = {}
    for unit in rent_roll_data:
        if unit.square_feet is not None:
            sqft = unit.square_feet
            
            if sqft not in units_by_sqft:
                units_by_sqft[sqft] = []
            units_by_sqft[sqft].append(unit)
    
    # Sort by square footage ascending
    sorted_sqft_values = sorted(units_by_sqft.keys())
    
    # Convert to response format
    unit_mix = []
    total_units = 0
    total_occupied = 0
    total_actual_rent = Decimal("0")
    total_market_rent = Decimal("0")
    total_square_feet = 0
    
    for sqft in sorted_sqft_values:
        units = units_by_sqft[sqft]
        
        # Calculate aggregated metrics
        group_total_units = len(units)
        group_occupied_units = len([u for u in units if u.lease_status.lower() == "occupied"])
        group_vacant_units = group_total_units - group_occupied_units
        
        # Calculate averages
        square_feet_values = [u.square_feet for u in units if u.square_feet is not None]
        avg_square_feet = int(sum(square_feet_values) / len(square_feet_values)) if square_feet_values else None
        
        bedroom_values = [u.bedrooms for u in units if u.bedrooms is not None]
        avg_bedrooms = sum(bedroom_values) / len(bedroom_values) if bedroom_values else None
        
        bathroom_values = [u.bathrooms for u in units if u.bathrooms is not None]
        avg_bathrooms = sum(bathroom_values) / len(bathroom_values) if bathroom_values else None
        
        # Calculate rent metrics
        actual_rents = [float(u.actual_rent) for u in units if u.actual_rent > 0]
        market_rents = [float(u.market_rent) for u in units if u.market_rent > 0]
        
        avg_actual_rent = Decimal(str(sum(actual_rents) / len(actual_rents))) if actual_rents else Decimal("0")
        avg_market_rent = Decimal(str(sum(market_rents) / len(market_rents))) if market_rents else Decimal("0")
        
        # Calculate rent premium
        rent_premium = avg_actual_rent - avg_market_rent if avg_market_rent > 0 else Decimal("0")
        
        # Calculate totals
        total_square_feet = sum(square_feet_values) if square_feet_values else None
        group_total_actual_rent = avg_actual_rent * group_total_units
        group_total_market_rent = avg_market_rent * group_total_units
        group_total_pro_forma_rent = group_total_actual_rent  # Default to actual rent
        
        # Get unit type from first unit (for display)
        unit_type = units[0].unit_type if units else "Unknown"
        
        unit_mix.append({
            "id": len(unit_mix) + 1,  # Generate ID for frontend
            "unit_type": unit_type,  # Use the actual unit type (1BR, 2BR)
            "unit_label": None,  # No unit_label column in SqFt view
            "total_units": group_total_units,
            "occupied_units": group_occupied_units,
            "vacant_units": group_vacant_units,
            "avg_square_feet": avg_square_feet,
            "avg_bedrooms": avg_bedrooms,
            "avg_bathrooms": avg_bathrooms,
            "avg_actual_rent": float(avg_actual_rent),
            "avg_market_rent": float(avg_market_rent),
            "rent_premium": float(rent_premium),
            "pro_forma_rent": float(avg_actual_rent),  # Default to actual rent
            "rent_growth_rate": None,
            "total_square_feet": total_square_feet,
            "total_actual_rent": float(group_total_actual_rent),
            "total_market_rent": float(group_total_market_rent),
            "total_pro_forma_rent": float(group_total_pro_forma_rent)
        })
        
        total_units += group_total_units
        total_occupied += group_occupied_units
        total_actual_rent += group_total_actual_rent
        total_market_rent += group_total_market_rent
    
    # Get provenance info from first unit mix row if exists
    provenance = "MANUAL"
    is_linked_to_nrr = False
    rent_roll_name = None
    last_derived_at = None
    last_manual_edit_at = None
    
    # Check if there's existing unit mix data to get provenance
    existing_ums = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    
    if existing_ums:
        first_row = existing_ums[0]
        provenance = first_row.provenance
        is_linked_to_nrr = first_row.is_linked_to_nrr
        rent_roll_name = first_row.rent_roll_name
        last_derived_at = first_row.last_derived_at.isoformat() if first_row.last_derived_at else None
        last_manual_edit_at = first_row.last_manual_edit_at.isoformat() if first_row.last_manual_edit_at else None
    
    # Calculate total square footage from unit_mix data
    total_square_feet = sum([row["total_square_feet"] for row in unit_mix if row["total_square_feet"] is not None])
    avg_square_feet = int(total_square_feet / total_units) if total_units > 0 else None
    
    return UnitMixResponse(
        deal_id=deal_id,
        provenance=provenance,
        is_linked_to_nrr=is_linked_to_nrr,
        rent_roll_name=rent_roll_name,
        last_derived_at=last_derived_at,
        last_manual_edit_at=last_manual_edit_at,
        unit_mix=unit_mix,
        totals={
            "total_units": total_units,
            "total_occupied": total_occupied,
            "total_actual_rent": float(total_actual_rent),
            "total_market_rent": float(total_market_rent),
            "total_square_feet": total_square_feet,
            "avg_square_feet": avg_square_feet
        }
    )


def get_unit_mix_by_unit_label(deal_id: int, session: Session) -> UnitMixResponse:
    """Get unit mix data grouped by unit label."""
    # Get normalized rent roll data
    rent_roll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    if not rent_roll_data:
        return UnitMixResponse(
            deal_id=deal_id,
            provenance="MANUAL",
            is_linked_to_nrr=False,
            unit_mix=[],
            totals={
                "total_units": 0,
                "total_occupied": 0,
                "total_actual_rent": 0.0,
                "total_market_rent": 0.0
            }
        )
    
    # Group units by unit label
    units_by_label = {}
    for unit in rent_roll_data:
        # Use unit_label if available, otherwise use "—" for blank
        unit_label = unit.unit_label.strip() if unit.unit_label and unit.unit_label.strip() else "—"
        
        if unit_label not in units_by_label:
            units_by_label[unit_label] = []
        units_by_label[unit_label].append(unit)
    
    # Sort by unit label A→Z, blanks last
    sorted_labels = sorted(units_by_label.keys(), key=lambda x: x if x != "—" else "zzz")
    
    # Convert to response format
    unit_mix = []
    total_units = 0
    total_occupied = 0
    total_actual_rent = Decimal("0")
    total_market_rent = Decimal("0")
    
    for unit_label in sorted_labels:
        units = units_by_label[unit_label]
        
        # Calculate aggregated metrics
        group_total_units = len(units)
        group_occupied_units = len([u for u in units if u.lease_status.lower() == "occupied"])
        group_vacant_units = group_total_units - group_occupied_units
        
        # Calculate averages
        square_feet_values = [u.square_feet for u in units if u.square_feet is not None]
        avg_square_feet = int(sum(square_feet_values) / len(square_feet_values)) if square_feet_values else None
        
        bedroom_values = [u.bedrooms for u in units if u.bedrooms is not None]
        avg_bedrooms = sum(bedroom_values) / len(bedroom_values) if bedroom_values else None
        
        bathroom_values = [u.bathrooms for u in units if u.bathrooms is not None]
        avg_bathrooms = sum(bathroom_values) / len(bathroom_values) if bathroom_values else None
        
        # Calculate rent metrics
        actual_rents = [float(u.actual_rent) for u in units if u.actual_rent > 0]
        market_rents = [float(u.market_rent) for u in units if u.market_rent > 0]
        
        avg_actual_rent = Decimal(str(sum(actual_rents) / len(actual_rents))) if actual_rents else Decimal("0")
        avg_market_rent = Decimal(str(sum(market_rents) / len(market_rents))) if market_rents else Decimal("0")
        
        # Calculate rent premium
        rent_premium = avg_actual_rent - avg_market_rent if avg_market_rent > 0 else Decimal("0")
        
        # Calculate totals
        total_square_feet = sum(square_feet_values) if square_feet_values else None
        group_total_actual_rent = avg_actual_rent * group_total_units
        group_total_market_rent = avg_market_rent * group_total_units
        group_total_pro_forma_rent = group_total_actual_rent  # Default to actual rent
        
        # Get unit type from first unit (for display)
        unit_type = units[0].unit_type if units else "Unknown"
        
        unit_mix.append({
            "id": len(unit_mix) + 1,  # Generate ID for frontend
            "unit_type": unit_label,  # Use unit label as the "unit type"
            "unit_label": unit_label,  # Show the actual unit label
            "total_units": group_total_units,
            "occupied_units": group_occupied_units,
            "vacant_units": group_vacant_units,
            "avg_square_feet": avg_square_feet,
            "avg_bedrooms": avg_bedrooms,
            "avg_bathrooms": avg_bathrooms,
            "avg_actual_rent": float(avg_actual_rent),
            "avg_market_rent": float(avg_market_rent),
            "rent_premium": float(rent_premium),
            "pro_forma_rent": float(avg_actual_rent),  # Default to actual rent
            "rent_growth_rate": None,
            "total_square_feet": total_square_feet,
            "total_actual_rent": float(group_total_actual_rent),
            "total_market_rent": float(group_total_market_rent),
            "total_pro_forma_rent": float(group_total_pro_forma_rent)
        })
        
        total_units += group_total_units
        total_occupied += group_occupied_units
        total_actual_rent += group_total_actual_rent
        total_market_rent += group_total_market_rent
    
    # Get provenance info from first unit mix row if exists
    provenance = "MANUAL"
    is_linked_to_nrr = False
    rent_roll_name = None
    last_derived_at = None
    last_manual_edit_at = None
    
    # Check if there's existing unit mix data to get provenance
    existing_ums = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    
    if existing_ums:
        first_row = existing_ums[0]
        provenance = first_row.provenance
        is_linked_to_nrr = first_row.is_linked_to_nrr
        rent_roll_name = first_row.rent_roll_name
        last_derived_at = first_row.last_derived_at.isoformat() if first_row.last_derived_at else None
        last_manual_edit_at = first_row.last_manual_edit_at.isoformat() if first_row.last_manual_edit_at else None
    
    # Calculate total square footage from unit_mix data
    total_square_feet = sum([row["total_square_feet"] for row in unit_mix if row["total_square_feet"] is not None])
    avg_square_feet = int(total_square_feet / total_units) if total_units > 0 else None
    
    return UnitMixResponse(
        deal_id=deal_id,
        provenance=provenance,
        is_linked_to_nrr=is_linked_to_nrr,
        rent_roll_name=rent_roll_name,
        last_derived_at=last_derived_at,
        last_manual_edit_at=last_manual_edit_at,
        unit_mix=unit_mix,
        totals={
            "total_units": total_units,
            "total_occupied": total_occupied,
            "total_actual_rent": float(total_actual_rent),
            "total_market_rent": float(total_market_rent),
            "total_square_feet": total_square_feet,
            "avg_square_feet": avg_square_feet
        }
    )


@router.get("/deals/{deal_id}/unit-mix", response_model=UnitMixResponse)
async def get_unit_mix(
    deal_id: int,
    group_by: str = "square_feet",
    session: Session = Depends(get_session)
) -> UnitMixResponse:
    """Get unit mix summary for a deal with automatic refresh."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Always get the latest data by querying the source tables directly
    # This ensures we never serve stale cached data
    
    # Get unit mix data
    if group_by == "square_feet":
        # For floor plan grouping, we need to derive from rent roll data directly
        return get_unit_mix_by_floor_plan(deal_id, session)
    elif group_by == "unit_label":
        # For unit label grouping, we need to derive from rent roll data directly
        return get_unit_mix_by_unit_label(deal_id, session)
    else:
        # Default unit type grouping - check if we have fresh unit mix data
        # If not, derive from rent roll data
        unit_mix_data = session.exec(
            select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
            .order_by(UnitMixSummary.unit_type)
        ).all()
        
        # If no unit mix data exists or it's stale, derive from rent roll
        if not unit_mix_data:
            # Try to derive from rent roll data
            try:
                derive_unit_mix_from_nrr(deal_id, session)
                # Re-query after derivation
                unit_mix_data = session.exec(
                    select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
                    .order_by(UnitMixSummary.unit_type)
                ).all()
            except Exception as e:
                # If derivation fails, return empty response
                logger.warning(f"Failed to derive unit mix for deal {deal_id}: {e}")
                unit_mix_data = []
    
    # Get provenance info from first row (all rows should have same provenance for a deal)
    provenance = "MANUAL"
    is_linked_to_nrr = False
    rent_roll_name = None
    last_derived_at = None
    last_manual_edit_at = None
    
    if unit_mix_data:
        first_row = unit_mix_data[0]
        provenance = first_row.provenance
        is_linked_to_nrr = first_row.is_linked_to_nrr
        rent_roll_name = first_row.rent_roll_name
        last_derived_at = first_row.last_derived_at.isoformat() if first_row.last_derived_at else None
        last_manual_edit_at = first_row.last_manual_edit_at.isoformat() if first_row.last_manual_edit_at else None
    
    # Convert to response format
    unit_mix = []
    total_units = 0
    total_occupied = 0
    total_actual_rent = Decimal("0")
    total_market_rent = Decimal("0")
    
    for row in unit_mix_data:
        unit_mix.append({
            "id": row.id,
            "unit_type": row.unit_type,
            "unit_label": None,  # No unit_label column in Type view
            "total_units": row.total_units,
            "occupied_units": row.occupied_units,
            "vacant_units": row.vacant_units,
            "avg_square_feet": row.avg_square_feet,
            "avg_bedrooms": row.avg_bedrooms,
            "avg_bathrooms": row.avg_bathrooms,
            "avg_actual_rent": float(row.avg_actual_rent),
            "avg_market_rent": float(row.avg_market_rent),
            "rent_premium": float(row.rent_premium),
            "pro_forma_rent": float(row.pro_forma_rent) if row.pro_forma_rent else None,
            "rent_growth_rate": float(row.rent_growth_rate) if row.rent_growth_rate else None,
            "total_square_feet": row.total_square_feet,
            "total_actual_rent": float(row.total_actual_rent),
            "total_market_rent": float(row.total_market_rent),
            "total_pro_forma_rent": float(row.total_pro_forma_rent)
        })
        
        total_units += row.total_units
        total_occupied += row.occupied_units
        total_actual_rent += row.total_actual_rent
        total_market_rent += row.total_market_rent
    
    # Calculate total square footage from unit_mix data
    total_square_feet = sum([row["total_square_feet"] for row in unit_mix if row["total_square_feet"] is not None])
    avg_square_feet = int(total_square_feet / total_units) if total_units > 0 else None
    
    return UnitMixResponse(
        deal_id=deal_id,
        provenance=provenance,
        is_linked_to_nrr=is_linked_to_nrr,
        rent_roll_name=rent_roll_name,
        last_derived_at=last_derived_at,
        last_manual_edit_at=last_manual_edit_at,
        unit_mix=unit_mix,
        totals={
            "total_units": total_units,
            "total_occupied": total_occupied,
            "total_actual_rent": float(total_actual_rent),
            "total_market_rent": float(total_market_rent),
            "total_square_feet": total_square_feet,
            "avg_square_feet": avg_square_feet
        }
    )


@router.post("/deals/{deal_id}/unit-mix/derive")
async def derive_from_rent_roll(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Derive unit mix summary from normalized rent roll data."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    try:
        derive_unit_mix_from_nrr(deal_id, session)
        return {"success": True, "message": "Unit mix derived from rent roll successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to derive unit mix: {str(e)}")


@router.put("/deals/{deal_id}/unit-mix")
async def update_unit_mix(
    deal_id: int,
    unit_mix_data: List[UnitMixRowCreate],
    session: Session = Depends(get_session)
) -> dict:
    """Update unit mix summary with manual edits."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Clear existing unit mix data
    existing_ums = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    for ums in existing_ums:
        session.delete(ums)
    
    # Create new unit mix rows
    current_time = datetime.utcnow()
    
    for row_data in unit_mix_data:
        # Calculate derived fields
        vacant_units = row_data.total_units - row_data.occupied_units
        rent_premium = row_data.avg_actual_rent - row_data.avg_market_rent if row_data.avg_market_rent > 0 else Decimal("0")
        total_actual_rent = row_data.avg_actual_rent * row_data.total_units
        total_market_rent = row_data.avg_market_rent * row_data.total_units
        total_pro_forma_rent = (row_data.pro_forma_rent or row_data.avg_actual_rent) * row_data.total_units
        
        ums = UnitMixSummary(
            deal_id=deal_id,
            unit_type=row_data.unit_type,
            unit_label=row_data.unit_label,
            total_units=row_data.total_units,
            occupied_units=row_data.occupied_units,
            vacant_units=vacant_units,
            avg_square_feet=row_data.avg_square_feet,
            avg_bedrooms=row_data.avg_bedrooms,
            avg_bathrooms=row_data.avg_bathrooms,
            avg_actual_rent=row_data.avg_actual_rent,
            avg_market_rent=row_data.avg_market_rent,
            rent_premium=rent_premium,
            pro_forma_rent=row_data.pro_forma_rent,
            rent_growth_rate=row_data.rent_growth_rate,
            total_square_feet=row_data.avg_square_feet * row_data.total_units if row_data.avg_square_feet else None,
            total_actual_rent=total_actual_rent,
            total_market_rent=total_market_rent,
            total_pro_forma_rent=total_pro_forma_rent,
            provenance="MANUAL",
            is_linked_to_nrr=False,
            last_manual_edit_at=current_time,
            created_at=current_time,
            updated_at=current_time
        )
        
        session.add(ums)
    
    session.commit()
    return {"success": True, "message": "Unit mix updated successfully"}


@router.post("/deals/{deal_id}/unit-mix/link")
async def link_to_rent_roll(
    deal_id: int,
    link_request: LinkRequest,
    session: Session = Depends(get_session)
) -> dict:
    """Link unit mix to specific rent roll and derive from NRR."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Verify rent roll exists and belongs to deal
    from ..models import DealDocument
    rent_roll = session.get(DealDocument, link_request.rrId)
    if not rent_roll or rent_roll.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Rent roll not found")
    
    # Normalize rent roll if needed
    if rent_roll.processing_status != "completed":
        # Here you would call the normalization logic
        # For now, just mark as completed
        rent_roll.processing_status = "completed"
        session.add(rent_roll)
        session.commit()
    
    try:
        derive_unit_mix_from_nrr(deal_id, session, rent_roll.original_filename)
        return {"success": True, "message": "Unit mix linked to rent roll and derived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to link unit mix: {str(e)}")


@router.post("/deals/{deal_id}/unit-mix/unlink")
async def unlink_from_rent_roll(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Unlink unit mix from rent roll, keeping current values for manual editing."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Update existing unit mix rows to mark as unlinked
    existing_ums = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    
    if not existing_ums:
        raise HTTPException(status_code=404, detail="No unit mix data found")
    
    current_time = datetime.utcnow()
    
    for ums in existing_ums:
        ums.provenance = "MANUAL"
        ums.is_linked_to_nrr = False
        ums.last_manual_edit_at = current_time
        ums.updated_at = current_time
    
    session.commit()
    return {"success": True, "message": "Unit mix unlinked from rent roll successfully"}


@router.delete("/deals/{deal_id}/unit-mix")
async def delete_unit_mix_row(
    deal_id: int,
    unit_mix_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Delete a specific unit mix row."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get the unit mix row
    ums = session.get(UnitMixSummary, unit_mix_id)
    if not ums or ums.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Unit mix row not found")
    
    # Check if linked to NRR (should not allow deletion)
    if ums.is_linked_to_nrr:
        raise HTTPException(status_code=400, detail="Cannot delete unit mix row that is linked to rent roll")
    
    session.delete(ums)
    session.commit()
    return {"success": True, "message": "Unit mix row deleted successfully"}


class BulkUpdateUnitLabelRequest(BaseModel):
    """Schema for bulk updating unit labels."""
    square_feet: int
    old_unit_label: Optional[str] = None
    new_unit_label: str


@router.patch("/deals/{deal_id}/rentroll/units/labels")
async def bulk_update_unit_labels(
    deal_id: int,
    request: BulkUpdateUnitLabelRequest,
    session: Session = Depends(get_session)
) -> dict:
    """Bulk update unit labels for all units in a floor plan grouping."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Validate unit label format
    if request.new_unit_label:
        if len(request.new_unit_label) > 16:
            raise HTTPException(status_code=422, detail="Unit label must be 16 characters or less")
        
        # Check for allowed characters: A-Z, a-z, 0-9, hyphen, underscore
        import re
        if not re.match(r'^[A-Za-z0-9\-_]+$', request.new_unit_label):
            raise HTTPException(status_code=422, detail="Unit label can only contain letters, numbers, hyphens, and underscores")
    
    # Normalize the new unit label (trim and uppercase)
    new_unit_label = request.new_unit_label.strip().upper() if request.new_unit_label else None
    old_unit_label = request.old_unit_label.strip() if request.old_unit_label and request.old_unit_label.strip() else None
    
    # Find units to update
    query = select(RentRollNormalized).where(
        RentRollNormalized.deal_id == deal_id,
        RentRollNormalized.square_feet == request.square_feet
    )
    
    if old_unit_label:
        # Update specific label
        query = query.where(RentRollNormalized.unit_label == old_unit_label)
    else:
        # Update blank/null labels
        query = query.where(
            (RentRollNormalized.unit_label.is_(None)) | 
            (RentRollNormalized.unit_label == "") |
            (RentRollNormalized.unit_label == "—")
        )
    
    units_to_update = session.exec(query).all()
    
    if not units_to_update:
        raise HTTPException(status_code=404, detail="No units found matching the criteria")
    
    # Update the units
    updated_count = 0
    for unit in units_to_update:
        unit.unit_label = new_unit_label
        session.add(unit)
        updated_count += 1
    
    session.commit()
    
    return {
        "success": True, 
        "message": f"Updated unit label for {updated_count} units",
        "updated_count": updated_count
    }


