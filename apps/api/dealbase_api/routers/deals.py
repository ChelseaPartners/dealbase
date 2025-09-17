"""Deals router."""

from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel

from ..database import get_session
from ..models import Deal, DealBase, RentRollNormalized, T12Normalized, UnitMixSummary, DealDocument
from ..utils import create_deal_slug

router = APIRouter()


class DealCreate(DealBase):
    """Deal creation schema."""

    slug: Optional[str] = None  # Will be generated if not provided


class LinkRequest(BaseModel):
    """Link request schema."""
    rrId: int


class DealResponse(DealBase):
    """Deal response schema."""

    id: int
    created_at: str
    updated_at: str


@router.get("/deals", response_model=List[DealResponse])
async def get_deals(session: Session = Depends(get_session)) -> List[DealResponse]:
    """Get all deals."""
    deals = session.exec(select(Deal)).all()
    return [
        DealResponse(
            id=deal.id,
            name=deal.name,
            slug=deal.slug,
            property_type=deal.property_type,
            address=deal.address,
            city=deal.city,
            state=deal.state,
            zip_code=deal.zip_code,
            description=deal.description,
            status=deal.status,
            created_at=deal.created_at.isoformat(),
            updated_at=deal.updated_at.isoformat(),
        )
        for deal in deals
    ]


@router.get("/deals/{deal_identifier}", response_model=DealResponse)
async def get_deal(deal_identifier: str, session: Session = Depends(get_session)) -> DealResponse:
    """Get a specific deal by ID or slug."""
    # Try to parse as integer first (for backward compatibility)
    try:
        deal_id = int(deal_identifier)
        deal = session.get(Deal, deal_id)
    except ValueError:
        # Not a number, treat as slug
        deal = session.exec(select(Deal).where(Deal.slug == deal_identifier)).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return DealResponse(
        id=deal.id,
        name=deal.name,
        slug=deal.slug,
        property_type=deal.property_type,
        address=deal.address,
        city=deal.city,
        state=deal.state,
        zip_code=deal.zip_code,
        description=deal.description,
        status=deal.status,
        created_at=deal.created_at.isoformat(),
        updated_at=deal.updated_at.isoformat(),
    )


@router.post("/deals", response_model=DealResponse)
async def create_deal(deal_data: DealCreate, session: Session = Depends(get_session)) -> DealResponse:
    """Create a new deal."""
    # Generate slug if not provided
    if not deal_data.slug:
        deal_data.slug = create_deal_slug(session, deal_data.name)
    
    deal = Deal(**deal_data.model_dump())
    session.add(deal)
    session.commit()
    session.refresh(deal)
    
    return DealResponse(
        id=deal.id,
        name=deal.name,
        slug=deal.slug,
        property_type=deal.property_type,
        address=deal.address,
        city=deal.city,
        state=deal.state,
        zip_code=deal.zip_code,
        description=deal.description,
        status=deal.status,
        created_at=deal.created_at.isoformat(),
        updated_at=deal.updated_at.isoformat(),
    )


@router.delete("/deals/{deal_identifier}")
async def delete_deal(deal_identifier: str, session: Session = Depends(get_session)) -> dict:
    """Delete a deal and all related data by ID or slug."""
    # Try to parse as integer first (for backward compatibility)
    try:
        deal_id = int(deal_identifier)
        deal = session.get(Deal, deal_id)
    except ValueError:
        # Not a number, treat as slug
        deal = session.exec(select(Deal).where(Deal.slug == deal_identifier)).first()
        if deal:
            deal_id = deal.id
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Delete related data first
    from ..models import T12Normalized, RentRollNormalized, ValuationRun, AuditEvent
    
    # Delete T12 data
    t12_records = session.exec(select(T12Normalized).where(T12Normalized.deal_id == deal_id)).all()
    for record in t12_records:
        session.delete(record)
    
    # Delete rent roll data
    rent_roll_records = session.exec(select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)).all()
    for record in rent_roll_records:
        session.delete(record)
    
    # Delete valuation runs
    valuation_runs = session.exec(select(ValuationRun).where(ValuationRun.deal_id == deal_id)).all()
    for run in valuation_runs:
        session.delete(run)
    
    # Delete audit events
    audit_events = session.exec(select(AuditEvent).where(AuditEvent.deal_id == deal_id)).all()
    for event in audit_events:
        session.delete(event)
    
    # Finally delete the deal
    session.delete(deal)
    session.commit()
    
    return {"message": "Deal deleted successfully", "id": deal_id}


class LeaseRateAnalysis(BaseModel):
    """Lease rate analysis for T3, T6, T12 periods."""
    unit_type: str
    unit_label: Optional[str] = None
    total_units: int
    occupied_units: int
    vacant_units: int
    
    # T3 Analysis (3 months)
    t3_avg_rent: Decimal
    t3_units_count: int
    t3_rent_trend: str  # "increasing", "decreasing", "stable"
    
    # T6 Analysis (6 months)
    t6_avg_rent: Decimal
    t6_units_count: int
    t6_rent_trend: str
    
    # T12 Analysis (12 months)
    t12_avg_rent: Decimal
    t12_units_count: int
    t12_rent_trend: str
    
    # Current vs Historical
    current_avg_rent: Decimal
    rent_premium_vs_t3: Decimal
    rent_premium_vs_t6: Decimal
    rent_premium_vs_t12: Decimal


class MonthlyRentTrend(BaseModel):
    """Monthly rent trend data."""
    month: int
    year: int
    month_name: str
    avg_rent: Decimal
    total_units: int
    occupied_units: int
    occupancy_rate: float


class ComprehensiveUnitMixAnalysis(BaseModel):
    """Comprehensive unit mix analysis with lease rates and trends."""
    deal_id: int
    analysis_date: str
    unit_mix: List[LeaseRateAnalysis]
    monthly_trends: List[MonthlyRentTrend]
    summary_stats: dict


# Removed duplicate unit mix endpoint - use /api/unit-mix instead


class RentRollInfo(BaseModel):
    """Rent roll information for listing."""
    id: int
    filename: str
    uploaded_at: str
    is_normalized: bool


@router.get("/deals/{deal_id}/rentroll/available", response_model=List[RentRollInfo])
async def get_available_rentrolls(deal_id: int, session: Session = Depends(get_session)) -> List[RentRollInfo]:
    """Get available rent rolls for a deal."""
    # Get all rent roll documents for this deal
    rentrolls = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_type == "rent_roll"
        )
    ).all()
    
    return [
        RentRollInfo(
            id=rr.id,
            filename=rr.original_filename or f"rentroll_{rr.id}",
            uploaded_at=rr.created_at.isoformat(),
            is_normalized=rr.processing_status == "completed"
        )
        for rr in rentrolls
    ]


@router.get("/deals/{deal_id}/rentroll/normalized")
async def get_normalized_rentroll(deal_id: int, session: Session = Depends(get_session)):
    """Get normalized rent roll data for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get normalized rent roll data
    rent_roll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
        .order_by(RentRollNormalized.unit_number)
    ).all()
    
    if not rent_roll_data:
        return {
            "data": [],
            "total_count": 0,
            "rent_roll_name": None,
            "last_updated": None
        }
    
    # Get rent roll document info
    rent_roll_doc = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_type == "rent_roll",
            DealDocument.processing_status == "completed"
        ).order_by(DealDocument.created_at.desc())
    ).first()
    
    # Convert to response format
    nrr_data = []
    for unit in rent_roll_data:
        nrr_data.append({
            "unit_number": unit.unit_number,
            "unit_label": unit.unit_label,
            "unit_sf": unit.square_feet,
            "market_rent": float(unit.market_rent) if unit.market_rent else None,
            "actual_rent": float(unit.actual_rent),
            "lease_start_date": unit.lease_start.isoformat() if unit.lease_start else None,
            "move_in_date": unit.move_in_date.isoformat() if unit.move_in_date else None,
            "lease_expiration_date": unit.lease_expiration.isoformat() if unit.lease_expiration else None
        })
    
    return {
        "data": nrr_data,
        "total_count": len(nrr_data),
        "rent_roll_name": rent_roll_doc.original_filename if rent_roll_doc else None,
        "last_updated": rent_roll_doc.updated_at.isoformat() if rent_roll_doc else None
    }


@router.post("/deals/{deal_id}/rentroll/{rr_id}/normalize")
async def normalize_rentroll(deal_id: int, rr_id: int, session: Session = Depends(get_session)):
    """Normalize a rent roll."""
    # Get the rent roll document
    rentroll = session.get(DealDocument, rr_id)
    if not rentroll or rentroll.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Rent roll not found")
    
    # Check if already normalized
    if rentroll.processing_status == "completed":
        return {"message": "Rent roll already normalized", "normalized": True}
    
    try:
        # Import the new clean parser
        from ..services.rentroll_parser import get_rentroll_parser
        
        # Create parser instance
        parser = get_rentroll_parser(session)
        
        # Parse the rent roll file
        file_path = rentroll.file_path
        result = parser.parse_rentroll(deal_id, file_path)
        
        # Persist to database
        parser.persist_to_database(deal_id, result['normalized_data'])
        
        # Mark as completed
        rentroll.processing_status = "completed"
        session.add(rentroll)
        session.commit()
        
        return {
            "message": "Rent roll normalized successfully", 
            "normalized": True,
            "records_processed": len(result['normalized_data']),
            "unit_mix_generated": True,
            "issues_found": len(result['issues_report']),
            "validation_passed": len(result['validation_report']['errors']) == 0
        }
        
    except Exception as e:
        # Mark as failed
        rentroll.processing_status = "failed"
        rentroll.processing_error = str(e)
        session.add(rentroll)
        session.commit()
        
        raise HTTPException(status_code=500, detail=f"Failed to normalize rent roll: {str(e)}")


@router.get("/deals/{deal_id}/documents")
async def get_deal_documents(deal_id: int, session: Session = Depends(get_session)) -> List[dict]:
    """Get all documents for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get all documents for this deal
    documents = session.exec(
        select(DealDocument).where(DealDocument.deal_id == deal_id)
        .order_by(DealDocument.created_at.desc())
    ).all()
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": doc.original_filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "content_type": doc.content_type,
            "processing_status": doc.processing_status,
            "processing_error": doc.processing_error,
            "created_at": doc.created_at.isoformat(),
            "updated_at": doc.updated_at.isoformat()
        }
        for doc in documents
    ]


@router.post("/deals/{deal_id}/unitmix/link")
async def link_unitmix_to_rentroll(
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
    rent_roll = session.get(DealDocument, link_request.rrId)
    if not rent_roll or rent_roll.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Rent roll not found")
    
    try:
        # Normalize rent roll if needed
        if rent_roll.processing_status != "completed":
            # Call the normalization endpoint
            from . import normalize_rentroll
            await normalize_rentroll(deal_id, link_request.rrId, session)
        
        # Derive unit mix from NRR
        from ..routers.unit_mix import derive_unit_mix_from_nrr
        derive_unit_mix_from_nrr(deal_id, session, rent_roll.original_filename)
        
        return {
            "success": True, 
            "message": f"Unit mix linked to {rent_roll.original_filename} and updated successfully",
            "rent_roll_name": rent_roll.original_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to link unit mix: {str(e)}")


