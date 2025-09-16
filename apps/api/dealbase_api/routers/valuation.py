"""Valuation router."""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from decimal import Decimal

from ..database import get_session
from ..models import Deal, ValuationRun, T12Normalized, RentRollNormalized

router = APIRouter()


class ValuationRequest(BaseModel):
    """Valuation request schema."""

    name: str
    assumptions: Dict[str, Any]


class ValuationResponse(BaseModel):
    """Valuation response schema."""

    id: int
    name: str
    status: str
    kpis: Dict[str, Any]
    created_at: str


class KPIs(BaseModel):
    """Key Performance Indicators."""

    irr: float
    equity_multiple: float
    dscr: float
    egi: float  # Effective Gross Income
    noi: float  # Net Operating Income
    cap_rate: float
    ltv: float  # Loan-to-Value


@router.post("/valuation/run/{deal_id}", response_model=ValuationResponse)
async def run_valuation(
    deal_id: int,
    request: ValuationRequest,
    session: Session = Depends(get_session)
) -> ValuationResponse:
    """Run valuation for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Create valuation run
    valuation_run = ValuationRun(
        deal_id=deal_id,
        name=request.name,
        status="running",
        assumptions=request.assumptions
    )
    session.add(valuation_run)
    session.commit()
    session.refresh(valuation_run)
    
    # Get T-12 data for calculations
    t12_data = session.exec(
        select(T12Normalized).where(T12Normalized.deal_id == deal_id)
    ).all()
    
    if not t12_data:
        raise HTTPException(status_code=400, detail="No T-12 data found for deal")
    
    # Calculate KPIs (simplified calculations for MVP)
    total_noi = sum(float(month.net_operating_income) for month in t12_data)
    annual_noi = total_noi / len(t12_data) * 12
    
    # Basic assumptions from request
    purchase_price = request.assumptions.get("purchase_price", 1000000)
    loan_amount = request.assumptions.get("loan_amount", 800000)
    exit_cap_rate = request.assumptions.get("exit_cap_rate", 0.05)
    hold_period = request.assumptions.get("hold_period", 5)
    
    # Calculate KPIs
    cap_rate = annual_noi / purchase_price
    ltv = loan_amount / purchase_price
    
    # Simplified IRR calculation (in real implementation, this would be more complex)
    annual_cash_flow = annual_noi - (loan_amount * 0.05)  # Assuming 5% interest
    exit_value = annual_noi / exit_cap_rate
    total_return = (annual_cash_flow * hold_period) + exit_value - purchase_price
    irr = (total_return / purchase_price) ** (1 / hold_period) - 1
    
    kpis = KPIs(
        irr=float(irr),
        equity_multiple=float(total_return / (purchase_price - loan_amount)),
        dscr=float(annual_noi / (loan_amount * 0.05)),
        egi=float(annual_noi),
        noi=float(annual_noi),
        cap_rate=float(cap_rate),
        ltv=float(ltv)
    )
    
    # Update valuation run with results
    valuation_run.status = "completed"
    valuation_run.results = kpis.model_dump()
    session.commit()
    
    return ValuationResponse(
        id=valuation_run.id,
        name=valuation_run.name,
        status=valuation_run.status,
        kpis=kpis.model_dump(),
        created_at=valuation_run.created_at.isoformat()
    )


@router.get("/valuation/runs/{deal_id}", response_model=List[ValuationResponse])
async def get_valuation_runs(
    deal_id: int,
    session: Session = Depends(get_session)
) -> List[ValuationResponse]:
    """Get all valuation runs for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    runs = session.exec(
        select(ValuationRun).where(ValuationRun.deal_id == deal_id)
    ).all()
    
    return [
        ValuationResponse(
            id=run.id,
            name=run.name,
            status=run.status,
            kpis=run.results,
            created_at=run.created_at.isoformat()
        )
        for run in runs
    ]
