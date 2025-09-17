"""Deals router."""

from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Deal, DealBase
from ..utils import create_deal_slug

router = APIRouter()


class DealCreate(DealBase):
    """Deal creation schema."""

    slug: Optional[str] = None  # Will be generated if not provided


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
