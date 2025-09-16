"""Deals router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Deal, DealBase

router = APIRouter()


class DealCreate(DealBase):
    """Deal creation schema."""

    pass


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


@router.get("/deals/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: int, session: Session = Depends(get_session)) -> DealResponse:
    """Get a specific deal."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return DealResponse(
        id=deal.id,
        name=deal.name,
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
    deal = Deal(**deal_data.model_dump())
    session.add(deal)
    session.commit()
    session.refresh(deal)
    
    return DealResponse(
        id=deal.id,
        name=deal.name,
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
