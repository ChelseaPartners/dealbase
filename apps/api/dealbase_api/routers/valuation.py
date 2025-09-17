"""Valuation router."""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from decimal import Decimal

from ..database import get_session
from ..models import Deal, ValuationRun, T12Normalized, RentRollNormalized, UnitMixSummary, RentRollAssumptions

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
    
    # Get rent roll data for unit count and rent analysis
    rentroll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    # Get unit mix summary
    unit_mix_data = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    
    # Get rent roll assumptions
    rentroll_assumptions = session.exec(
        select(RentRollAssumptions).where(RentRollAssumptions.deal_id == deal_id)
    ).first()
    
    if not t12_data:
        raise HTTPException(status_code=400, detail="No T-12 data found for deal")
    
    # Derive assumptions from data if not provided in request
    derived_assumptions = _derive_assumptions_from_data(
        deal_id, t12_data, rentroll_data, unit_mix_data, rentroll_assumptions
    )
    
    # Merge with request assumptions (request overrides derived)
    final_assumptions = {**derived_assumptions, **request.assumptions}
    
    # Calculate KPIs using comprehensive data
    kpis = _calculate_comprehensive_kpis(
        t12_data, rentroll_data, unit_mix_data, final_assumptions
    )
    
    # Update valuation run with results
    valuation_run.status = "completed"
    valuation_run.results = kpis.model_dump()
    valuation_run.assumptions = final_assumptions
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


def _derive_assumptions_from_data(
    deal_id: int, 
    t12_data: List[T12Normalized], 
    rentroll_data: List[RentRollNormalized],
    unit_mix_data: List[UnitMixSummary],
    rentroll_assumptions: Optional[RentRollAssumptions]
) -> Dict[str, Any]:
    """Derive valuation assumptions from uploaded data."""
    
    # Calculate annual metrics from T-12
    monthly_noi = [month.net_operating_income for month in t12_data]
    monthly_egi = [month.total_income for month in t12_data]
    
    annual_noi = sum(monthly_noi) / len(monthly_noi) * 12 if monthly_noi else 0
    annual_egi = sum(monthly_egi) / len(monthly_egi) * 12 if monthly_egi else 0
    
    # Calculate unit metrics from rent roll
    unit_count = len(rentroll_data)
    total_square_feet = sum(unit.square_feet or 0 for unit in rentroll_data)
    avg_unit_sf = total_square_feet / unit_count if unit_count > 0 else 0
    
    # Calculate rent metrics
    total_actual_rent = sum(unit.actual_rent for unit in rentroll_data)
    total_market_rent = sum(unit.market_rent for unit in rentroll_data)
    avg_rent = total_actual_rent / unit_count if unit_count > 0 else 0
    
    # Calculate pro forma rent from assumptions or use market rent
    total_pro_forma_rent = total_market_rent
    if rentroll_assumptions and rentroll_assumptions.pro_forma_rents:
        total_pro_forma_rent = 0
        for unit in rentroll_data:
            pro_forma_rent = rentroll_assumptions.pro_forma_rents.get(unit.unit_type, unit.market_rent)
            total_pro_forma_rent += pro_forma_rent
    
    # Derive financial assumptions
    cap_rate = 0.055  # Default market cap rate
    purchase_price = annual_noi / cap_rate if annual_noi > 0 else 1000000
    loan_amount = purchase_price * 0.8  # 80% LTV
    
    # Calculate expense ratio
    expense_ratio = (annual_egi - annual_noi) / annual_egi if annual_egi > 0 else 0.35
    
    return {
        # Data-derived parameters
        "unit_count": unit_count,
        "total_square_feet": total_square_feet,
        "average_unit_sf": avg_unit_sf,
        "average_rent": avg_rent,
        "total_actual_rent": total_actual_rent,
        "total_market_rent": total_market_rent,
        "total_pro_forma_rent": total_pro_forma_rent,
        "annual_noi": annual_noi,
        "annual_egi": annual_egi,
        
        # Calculated financial parameters
        "purchase_price": purchase_price,
        "loan_amount": loan_amount,
        "cap_rate": cap_rate,
        "expense_ratio": expense_ratio,
        
        # Market assumptions (can be overridden)
        "interest_rate": 0.05,
        "exit_cap_rate": 0.055,
        "hold_period": 5,
        "vacancy_rate": float(rentroll_assumptions.vacancy_rate) if rentroll_assumptions else 0.05,
        "market_rent_growth": float(rentroll_assumptions.market_rent_growth) if rentroll_assumptions else 0.03,
    }


def _calculate_comprehensive_kpis(
    t12_data: List[T12Normalized],
    rentroll_data: List[RentRollNormalized], 
    unit_mix_data: List[UnitMixSummary],
    assumptions: Dict[str, Any]
) -> KPIs:
    """Calculate comprehensive KPIs using all available data."""
    
    # Extract key assumptions
    purchase_price = assumptions.get("purchase_price", 1000000)
    loan_amount = assumptions.get("loan_amount", 800000)
    interest_rate = assumptions.get("interest_rate", 0.05)
    exit_cap_rate = assumptions.get("exit_cap_rate", 0.055)
    hold_period = assumptions.get("hold_period", 5)
    vacancy_rate = assumptions.get("vacancy_rate", 0.05)
    market_rent_growth = assumptions.get("market_rent_growth", 0.03)
    
    # Calculate annual metrics
    monthly_noi = [month.net_operating_income for month in t12_data]
    annual_noi = sum(monthly_noi) / len(monthly_noi) * 12 if monthly_noi else 0
    
    # Calculate rent metrics
    total_actual_rent = sum(unit.actual_rent for unit in rentroll_data)
    total_market_rent = sum(unit.market_rent for unit in rentroll_data)
    total_pro_forma_rent = assumptions.get("total_pro_forma_rent", total_market_rent)
    
    # Calculate occupancy metrics
    unit_count = len(rentroll_data)
    occupied_units = len([unit for unit in rentroll_data if unit.lease_status == 'occupied'])
    occupancy_rate = occupied_units / unit_count if unit_count > 0 else 0
    
    # Calculate cap rate
    cap_rate = annual_noi / purchase_price if purchase_price > 0 else 0
    
    # Calculate LTV
    ltv = loan_amount / purchase_price if purchase_price > 0 else 0
    
    # Calculate debt service
    annual_debt_service = loan_amount * interest_rate
    
    # Calculate DSCR
    dscr = annual_noi / annual_debt_service if annual_debt_service > 0 else 0
    
    # Calculate equity
    equity = purchase_price - loan_amount
    
    # Calculate annual cash flow
    annual_cash_flow = annual_noi - annual_debt_service
    
    # Calculate cash on cash return
    cash_on_cash = annual_cash_flow / equity if equity > 0 else 0
    
    # Calculate exit value (using pro forma NOI with growth)
    pro_forma_noi = total_pro_forma_rent * 12 * (1 - vacancy_rate) * (1 - assumptions.get("expense_ratio", 0.35))
    exit_noi = pro_forma_noi * (1 + market_rent_growth) ** hold_period
    exit_value = exit_noi / exit_cap_rate
    
    # Calculate total return
    total_cash_flow = annual_cash_flow * hold_period
    total_return = total_cash_flow + exit_value - purchase_price
    
    # Calculate IRR (simplified)
    irr = (total_return / purchase_price) ** (1 / hold_period) - 1 if purchase_price > 0 else 0
    
    # Calculate equity multiple
    equity_multiple = total_return / equity if equity > 0 else 0
    
    # Calculate rent per square foot
    total_sf = sum(unit.square_feet or 0 for unit in rentroll_data)
    rent_per_sqft = total_actual_rent / total_sf if total_sf > 0 else 0
    
    # Calculate price per square foot
    price_per_sqft = purchase_price / total_sf if total_sf > 0 else 0
    
    return KPIs(
        irr=float(irr),
        equity_multiple=float(equity_multiple),
        dscr=float(dscr),
        egi=float(assumptions.get("annual_egi", 0)),
        noi=float(annual_noi),
        cap_rate=float(cap_rate),
        ltv=float(ltv),
        cash_on_cash=float(cash_on_cash),
        unlevered_irr=float(irr),  # Simplified - same as levered for now
        levered_irr=float(irr),
        payback_period=float(equity / annual_cash_flow) if annual_cash_flow > 0 else 0,
        break_even_occupancy=float(annual_debt_service / (total_actual_rent * 12)) if total_actual_rent > 0 else 0,
        debt_yield=float(annual_noi / loan_amount) if loan_amount > 0 else 0,
        debt_service=float(annual_debt_service),
        total_return=float(total_return),
        price_per_sqft=float(price_per_sqft),
        rent_per_sqft=float(rent_per_sqft),
        occupancy_rate=float(occupancy_rate),
        dscr_minimum=1.25,  # Standard minimum
        ltv_maximum=0.80,   # Standard maximum
        debt_coverage_ratio=float(dscr),
        interest_rate=float(interest_rate),
        vacancy_rate=float(vacancy_rate)
    )
