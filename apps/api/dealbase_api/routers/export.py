"""Export router."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
import xlsxwriter
import io

from ..database import get_session
from ..models import Deal, ValuationRun, T12Normalized, RentRollNormalized

router = APIRouter()


@router.get("/export/xlsx/{deal_id}")
async def export_deal_xlsx(
    deal_id: int,
    session: Session = Depends(get_session)
) -> StreamingResponse:
    """Export deal data to Excel."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get valuation runs
    valuation_runs = session.exec(
        select(ValuationRun).where(ValuationRun.deal_id == deal_id)
    ).all()
    
    # Get T-12 data
    t12_data = session.exec(
        select(T12Normalized).where(T12Normalized.deal_id == deal_id)
    ).all()
    
    # Get rent roll data
    rent_roll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    # Create Excel file in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    
    # Deal Summary Sheet
    summary_sheet = workbook.add_worksheet("Deal Summary")
    summary_sheet.write(0, 0, "Deal Name")
    summary_sheet.write(0, 1, deal.name)
    summary_sheet.write(1, 0, "Property Type")
    summary_sheet.write(1, 1, deal.property_type)
    summary_sheet.write(2, 0, "Address")
    summary_sheet.write(2, 1, f"{deal.address}, {deal.city}, {deal.state} {deal.zip_code}")
    summary_sheet.write(3, 0, "Status")
    summary_sheet.write(3, 1, deal.status)
    
    # Valuation Results Sheet
    if valuation_runs:
        valuation_sheet = workbook.add_worksheet("Valuation Results")
        headers = ["Run Name", "IRR", "Equity Multiple", "DSCR", "EGI", "NOI", "Cap Rate", "LTV"]
        for col, header in enumerate(headers):
            valuation_sheet.write(0, col, header)
        
        for row, run in enumerate(valuation_runs, 1):
            if run.results:
                valuation_sheet.write(row, 0, run.name)
                valuation_sheet.write(row, 1, run.results.get("irr", 0))
                valuation_sheet.write(row, 2, run.results.get("equity_multiple", 0))
                valuation_sheet.write(row, 3, run.results.get("dscr", 0))
                valuation_sheet.write(row, 4, run.results.get("egi", 0))
                valuation_sheet.write(row, 5, run.results.get("noi", 0))
                valuation_sheet.write(row, 6, run.results.get("cap_rate", 0))
                valuation_sheet.write(row, 7, run.results.get("ltv", 0))
    
    # T-12 Data Sheet
    if t12_data:
        t12_sheet = workbook.add_worksheet("T-12 Data")
        headers = ["Month", "Year", "Gross Rent", "Other Income", "Total Income", "Operating Expenses", "NOI"]
        for col, header in enumerate(headers):
            t12_sheet.write(0, col, header)
        
        for row, month in enumerate(t12_data, 1):
            t12_sheet.write(row, 0, month.month)
            t12_sheet.write(row, 1, month.year)
            t12_sheet.write(row, 2, float(month.gross_rent))
            t12_sheet.write(row, 3, float(month.other_income))
            t12_sheet.write(row, 4, float(month.total_income))
            t12_sheet.write(row, 5, float(month.operating_expenses))
            t12_sheet.write(row, 6, float(month.net_operating_income))
    
    # Rent Roll Sheet
    if rent_roll_data:
        rent_roll_sheet = workbook.add_worksheet("Rent Roll")
        headers = ["Unit Number", "Unit Type", "Square Feet", "Bedrooms", "Bathrooms", "Rent", "Market Rent", "Tenant Name"]
        for col, header in enumerate(headers):
            rent_roll_sheet.write(0, col, header)
        
        for row, unit in enumerate(rent_roll_data, 1):
            rent_roll_sheet.write(row, 0, unit.unit_number)
            rent_roll_sheet.write(row, 1, unit.unit_type)
            rent_roll_sheet.write(row, 2, unit.square_feet or "")
            rent_roll_sheet.write(row, 3, unit.bedrooms or "")
            rent_roll_sheet.write(row, 4, unit.bathrooms or "")
            rent_roll_sheet.write(row, 5, float(unit.rent))
            rent_roll_sheet.write(row, 6, float(unit.market_rent) if unit.market_rent else "")
            rent_roll_sheet.write(row, 7, unit.tenant_name or "")
    
    workbook.close()
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=deal_{deal_id}_export.xlsx"}
    )
