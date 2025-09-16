"""Data intake router."""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel
import pandas as pd
import io

from ..database import get_session
from ..models import Deal, T12Normalized, RentRollNormalized

router = APIRouter()


class IntakeResponse(BaseModel):
    """Intake response schema."""

    success: bool
    message: str
    preview_data: List[Dict[str, Any]]
    mapping_report: Dict[str, Any]


@router.post("/intake/t12/{deal_id}")
async def intake_t12(
    deal_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> IntakeResponse:
    """Intake T-12 data from CSV/Excel file."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Read file content
    content = await file.read()
    
    # Parse based on file extension
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    elif file.filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Basic validation and mapping
    required_columns = ['month', 'year', 'gross_rent', 'operating_expenses']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return IntakeResponse(
            success=False,
            message=f"Missing required columns: {missing_columns}",
            preview_data=[],
            mapping_report={}
        )
    
    # Calculate derived fields
    df['total_income'] = df['gross_rent'] + df.get('other_income', 0)
    df['net_operating_income'] = df['total_income'] - df['operating_expenses']
    
    # Save T-12 data to database
    from decimal import Decimal
    from ..models import T12Normalized
    
    # Clear existing T-12 data for this deal
    existing_t12 = session.exec(
        select(T12Normalized).where(T12Normalized.deal_id == deal_id)
    ).all()
    for record in existing_t12:
        session.delete(record)
    
    # Save new T-12 data
    for _, row in df.iterrows():
        t12_record = T12Normalized(
            deal_id=deal_id,
            month=int(row['month']),
            year=int(row['year']),
            gross_rent=Decimal(str(row['gross_rent'])),
            other_income=Decimal(str(row.get('other_income', 0))),
            total_income=Decimal(str(row['total_income'])),
            operating_expenses=Decimal(str(row['operating_expenses'])),
            net_operating_income=Decimal(str(row['net_operating_income']))
        )
        session.add(t12_record)
    
    session.commit()
    
    # Return preview and mapping report
    # Convert numpy types to Python native types for JSON serialization
    preview_df = df.head(10).copy()
    for col in preview_df.columns:
        if preview_df[col].dtype == 'int64':
            preview_df[col] = preview_df[col].astype(int)
        elif preview_df[col].dtype == 'float64':
            preview_df[col] = preview_df[col].astype(float)

    preview_data = preview_df.to_dict('records')
    mapping_report = {
        "total_rows": int(len(df)),
        "date_range": f"{int(df['year'].min())}-{int(df['year'].max())}",
        "columns_mapped": list(df.columns),
        "data_quality": {
            "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
            "negative_noi_months": int((df['net_operating_income'] < 0).sum())
        }
    }
    
    return IntakeResponse(
        success=True,
        message="T-12 data processed and saved successfully",
        preview_data=preview_data,
        mapping_report=mapping_report
    )


@router.post("/intake/rentroll/{deal_id}")
async def intake_rentroll(
    deal_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> IntakeResponse:
    """Intake rent roll data from CSV/Excel file."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Read file content
    content = await file.read()
    
    # Parse based on file extension
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    elif file.filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Basic validation and mapping
    required_columns = ['unit_number', 'rent']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        return IntakeResponse(
            success=False,
            message=f"Missing required columns: {missing_columns}",
            preview_data=[],
            mapping_report={}
        )
    
    # Return preview and mapping report
    # Convert numpy types to Python native types for JSON serialization
    preview_df = df.head(10).copy()
    for col in preview_df.columns:
        if preview_df[col].dtype == 'int64':
            preview_df[col] = preview_df[col].astype(int)
        elif preview_df[col].dtype == 'float64':
            preview_df[col] = preview_df[col].astype(float)

    preview_data = preview_df.to_dict('records')
    mapping_report = {
        "total_units": int(len(df)),
        "total_rent": float(df['rent'].sum()),
        "average_rent": float(df['rent'].mean()),
        "columns_mapped": list(df.columns),
        "data_quality": {
            "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
            "zero_rent_units": int((df['rent'] == 0).sum())
        }
    }
    
    return IntakeResponse(
        success=True,
        message="Rent roll data processed successfully",
        preview_data=preview_data,
        mapping_report=mapping_report
    )
