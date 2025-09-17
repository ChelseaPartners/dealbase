"""Data intake router."""

from typing import List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel
import pandas as pd
import io
import os
import hashlib
from pathlib import Path
from datetime import datetime

from ..database import get_session
from ..models import Deal, T12Normalized, RentRollNormalized, UnitMixSummary, RentRollAssumptions, DealDocument

router = APIRouter()


def save_document(deal_id: int, file: UploadFile, file_type: str, session: Session) -> DealDocument:
    """Save uploaded file and create document record."""
    
    # Create uploads directory if it doesn't exist
    uploads_dir = Path(__file__).parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ""
    filename = f"deal_{deal_id}_{file_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = uploads_dir / filename
    
    # Read file content and calculate hash
    content = file.file.read()
    file_hash = hashlib.md5(content).hexdigest()
    
    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Clear existing documents of this type for this deal
    existing_docs = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_type == file_type
        )
    ).all()
    
    for doc in existing_docs:
        # Delete the old file
        old_file_path = Path(doc.file_path)
        if old_file_path.exists():
            old_file_path.unlink()
        session.delete(doc)
    
    # Create new document record
    document = DealDocument(
        deal_id=deal_id,
        filename=filename,
        original_filename=file.filename or f"uploaded_file{file_extension}",
        file_type=file_type,
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        file_path=str(file_path),
        file_hash=file_hash,
        processing_status="pending"
    )
    
    session.add(document)
    session.commit()
    session.refresh(document)
    
    return document


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
        # Try different header positions to find the actual column headers
        df = None
        
        # First, let's see what's in the first few rows
        print(f"DEBUG: Analyzing Excel file structure...")
        for row_num in range(10):
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=row_num, nrows=1)
                print(f"DEBUG: Row {row_num} columns: {list(test_df.columns)}")
            except:
                break
        
        # Now try to find the best header position
        for header_row in range(10):  # Try headers 0-9
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=header_row)
                
                # Check if we found meaningful column names
                meaningful_cols = []
                for col in test_df.columns:
                    col_str = str(col).strip()
                    if (not col_str.startswith('Unnamed:') and 
                        col_str not in ['', 'nan', 'NaN', 'None'] and
                        len(col_str) > 1):
                        meaningful_cols.append(col_str)
                
                print(f"DEBUG: Header {header_row}: {len(meaningful_cols)} meaningful columns: {meaningful_cols}")
                
                if len(meaningful_cols) >= 3:  # Need at least 3 meaningful columns
                    df = test_df
                    print(f"DEBUG: ✅ Using header={header_row}, found {len(meaningful_cols)} meaningful columns")
                    print(f"DEBUG: Final columns: {list(df.columns)}")
                    break
                    
            except Exception as e:
                print(f"DEBUG: Failed to read with header={header_row}: {e}")
                continue
        
        # If still no good columns found, use the original approach
        if df is None:
            print(f"DEBUG: ❌ No good header found, using default")
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


@router.post("/intake/rentroll/preview/{deal_id}")
async def preview_rentroll(
    deal_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> IntakeResponse:
    """Preview rent roll data with auto-mapping and normalization."""
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
        # Try different header positions to find the actual column headers
        df = None
        
        # First, let's see what's in the first few rows
        print(f"DEBUG: Analyzing Excel file structure...")
        for row_num in range(10):
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=row_num, nrows=1)
                print(f"DEBUG: Row {row_num} columns: {list(test_df.columns)}")
            except:
                break
        
        # Now try to find the best header position
        for header_row in range(10):  # Try headers 0-9
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=header_row)
                
                # Check if we found meaningful column names
                meaningful_cols = []
                for col in test_df.columns:
                    col_str = str(col).strip()
                    if (not col_str.startswith('Unnamed:') and 
                        col_str not in ['', 'nan', 'NaN', 'None'] and
                        len(col_str) > 1):
                        meaningful_cols.append(col_str)
                
                print(f"DEBUG: Header {header_row}: {len(meaningful_cols)} meaningful columns: {meaningful_cols}")
                
                if len(meaningful_cols) >= 3:  # Need at least 3 meaningful columns
                    df = test_df
                    print(f"DEBUG: ✅ Using header={header_row}, found {len(meaningful_cols)} meaningful columns")
                    print(f"DEBUG: Final columns: {list(df.columns)}")
                    break
                    
            except Exception as e:
                print(f"DEBUG: Failed to read with header={header_row}: {e}")
                continue
        
        # If still no good columns found, use the original approach
        if df is None:
            print(f"DEBUG: ❌ No good header found, using default")
            df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Use RentRollNormalizer for intelligent processing
    from ..services.rentroll_normalization import get_rentroll_normalizer
    normalizer = get_rentroll_normalizer(session)
    
    try:
        # Normalize and analyze data
        result = normalizer.normalize_rentroll_data(deal_id, df)
        
        return IntakeResponse(
            success=True,
            message="Rent roll data processed and normalized successfully",
            preview_data=result["preview_rows"],
            mapping_report={
                "column_mapping": result["column_mapping"],
                "validation_report": result["validation_report"],
                "normalized_data": result["normalized_data"]
            }
        )
        
    except Exception as e:
        return IntakeResponse(
            success=False,
            message=f"Error processing rent roll: {str(e)}",
            preview_data=[],
            mapping_report={}
        )


@router.post("/intake/rentroll/{deal_id}")
async def upload_rentroll(
    deal_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> dict:
    """Upload and process rent roll data in one step."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Save the raw document first
    document = save_document(deal_id, file, "rent_roll", session)
    print(f"DEBUG: Saved document: {document.original_filename} -> {document.filename}")
    
    # Read file content for processing
    content = await file.read()
    
    # Parse based on file extension
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    elif file.filename.endswith(('.xlsx', '.xls')):
        # Try different header positions to find the actual column headers
        df = None
        
        # First, let's see what's in the first few rows
        print(f"DEBUG: Analyzing Excel file structure...")
        for row_num in range(10):
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=row_num, nrows=1)
                print(f"DEBUG: Row {row_num} columns: {list(test_df.columns)}")
            except:
                break
        
        # Now try to find the best header position
        for header_row in range(10):  # Try headers 0-9
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=header_row)
                
                # Check if we found meaningful column names
                meaningful_cols = []
                for col in test_df.columns:
                    col_str = str(col).strip()
                    if (not col_str.startswith('Unnamed:') and 
                        col_str not in ['', 'nan', 'NaN', 'None'] and
                        len(col_str) > 1):
                        meaningful_cols.append(col_str)
                
                print(f"DEBUG: Header {header_row}: {len(meaningful_cols)} meaningful columns: {meaningful_cols}")
                
                if len(meaningful_cols) >= 3:  # Need at least 3 meaningful columns
                    df = test_df
                    print(f"DEBUG: ✅ Using header={header_row}, found {len(meaningful_cols)} meaningful columns")
                    print(f"DEBUG: Final columns: {list(df.columns)}")
                    break
                    
            except Exception as e:
                print(f"DEBUG: Failed to read with header={header_row}: {e}")
                continue
        
        # If still no good columns found, use the original approach
        if df is None:
            print(f"DEBUG: ❌ No good header found, using default")
            df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Use RentRollNormalizer for intelligent processing
    from ..services.rentroll_normalization import get_rentroll_normalizer
    normalizer = get_rentroll_normalizer(session)
    
    try:
        print(f"DEBUG: Processing rent roll for deal {deal_id}, file: {file.filename}")
        print(f"DEBUG: DataFrame shape: {df.shape}")
        print(f"DEBUG: DataFrame columns: {list(df.columns)}")
        
        # Normalize and analyze data
        result = normalizer.normalize_rentroll_data(deal_id, df)
        
        print(f"DEBUG: Normalization result keys: {list(result.keys())}")
        print(f"DEBUG: Normalized data count: {len(result.get('normalized_data', []))}")
        
        if not result.get("normalized_data"):
            return {
                "success": False,
                "message": "No data could be processed from the uploaded file",
                "error": "File appears to be empty or columns could not be mapped",
                "debug": {
                    "df_shape": df.shape,
                    "df_columns": list(df.columns),
                    "result_keys": list(result.keys()),
                    "normalized_data_count": len(result.get("normalized_data", []))
                }
            }
        
        # Commit the data to database
        print(f"DEBUG: Attempting to commit {len(result['normalized_data'])} units to database")
        success = normalizer.commit_to_database(deal_id, result["normalized_data"])
        print(f"DEBUG: Database commit result: {success}")
        
        if success:
            return {
                "success": True,
                "message": f"Rent roll uploaded successfully! Processed {len(result['normalized_data'])} units.",
                "units_processed": len(result["normalized_data"]),
                "column_mapping": result["column_mapping"],
                "validation_report": result["validation_report"],
                "debug": {
                    "normalized_data_count": len(result.get("normalized_data", [])),
                    "preview_rows_count": len(result.get("preview_rows", [])),
                    "commit_success": success
                }
            }
        else:
            return {
                "success": False,
                "message": "Failed to save data to database",
                "error": "Database commit failed",
                "debug": {
                    "normalized_data_count": len(result.get("normalized_data", [])),
                    "commit_success": success
                }
            }
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"DEBUG: Exception in rent roll upload: {str(e)}")
        print(f"DEBUG: Traceback: {error_traceback}")
        return {
            "success": False,
            "message": f"Error processing rent roll: {str(e)}",
            "error": str(e),
            "traceback": error_traceback
        }


@router.get("/deals/{deal_id}/documents")
async def get_deal_documents(
    deal_id: int,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """Get all documents for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get documents
    documents = session.exec(
        select(DealDocument).where(DealDocument.deal_id == deal_id)
        .order_by(DealDocument.created_at.desc())
    ).all()
    
    return [
        {
            "id": doc.id,
            "filename": doc.original_filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "processing_status": doc.processing_status,
            "processing_error": doc.processing_error,
            "created_at": doc.created_at.isoformat(),
            "updated_at": doc.updated_at.isoformat()
        }
        for doc in documents
    ]


@router.post("/intake/rentroll/commit/{deal_id}")
async def commit_rentroll(
    deal_id: int,
    request: dict,
    session: Session = Depends(get_session)
) -> dict:
    """Commit normalized rent roll data to database."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    try:
        from ..services.rentroll_normalization import get_rentroll_normalizer
        normalizer = get_rentroll_normalizer(session)
        
        # Get normalized data from request
        normalized_data = request.get("normalized_data", [])
        
        if not normalized_data:
            raise HTTPException(status_code=400, detail="No normalized data provided")
        
        # Commit to database
        success = normalizer.commit_to_database(deal_id, normalized_data)
        
        if success:
            return {
                "success": True,
                "message": f"Successfully committed {len(normalized_data)} rent roll units",
                "units_committed": len(normalized_data)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to commit rent roll data")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error committing rent roll: {str(e)}")


@router.get("/deals/{deal_id}/rentroll")
async def get_rentroll_data(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Get normalized rent roll data for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get normalized rent roll data
    rentroll_data = session.exec(
        select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
    ).all()
    
    # Convert to response format
    units = []
    for unit in rentroll_data:
        units.append({
            "id": unit.id,
            "unit_number": unit.unit_number,
            "unit_label": unit.unit_label,
            "unit_type": unit.unit_type,
            "square_feet": unit.square_feet,
            "bedrooms": unit.bedrooms,
            "bathrooms": unit.bathrooms,
            "actual_rent": float(unit.actual_rent),
            "market_rent": float(unit.market_rent),
            "lease_start": unit.lease_start.isoformat() if unit.lease_start else None,
            "move_in_date": unit.move_in_date.isoformat() if unit.move_in_date else None,
            "lease_expiration": unit.lease_expiration.isoformat() if unit.lease_expiration else None,
            "tenant_name": unit.tenant_name,
            "lease_status": unit.lease_status
        })
    
    return {
        "deal_id": deal_id,
        "units": units,
        "total_units": len(units)
    }


@router.get("/deals/{deal_id}/unit-mix")
async def get_unit_mix_summary(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Get unit mix summary for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get unit mix summary
    unit_mix = session.exec(
        select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
    ).all()
    
    # Convert to response format
    mix_summary = []
    total_units = 0
    total_actual_rent = 0
    total_market_rent = 0
    
    for mix in unit_mix:
        mix_summary.append({
            "unit_type": mix.unit_type,
            "unit_label": mix.unit_label,
            "total_units": mix.total_units,
            "occupied_units": mix.occupied_units,
            "vacant_units": mix.vacant_units,
            "avg_square_feet": mix.avg_square_feet,
            "avg_bedrooms": mix.avg_bedrooms,
            "avg_bathrooms": mix.avg_bathrooms,
            "avg_actual_rent": float(mix.avg_actual_rent),
            "avg_market_rent": float(mix.avg_market_rent),
            "rent_premium": float(mix.rent_premium),
            "pro_forma_rent": float(mix.pro_forma_rent) if mix.pro_forma_rent else None,
            "total_square_feet": mix.total_square_feet,
            "total_actual_rent": float(mix.total_actual_rent),
            "total_market_rent": float(mix.total_market_rent),
            "total_pro_forma_rent": float(mix.total_pro_forma_rent)
        })
        
        total_units += mix.total_units
        total_actual_rent += float(mix.total_actual_rent)
        total_market_rent += float(mix.total_market_rent)
    
    return {
        "deal_id": deal_id,
        "unit_mix": mix_summary,
        "totals": {
            "total_units": total_units,
            "total_actual_rent": total_actual_rent,
            "total_market_rent": total_market_rent
        }
    }


@router.get("/deals/{deal_id}/rentroll-assumptions")
async def get_rentroll_assumptions(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Get rent roll assumptions for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get or create assumptions
    assumptions = session.exec(
        select(RentRollAssumptions).where(RentRollAssumptions.deal_id == deal_id)
    ).first()
    
    if not assumptions:
        # Create default assumptions
        assumptions = RentRollAssumptions(
            deal_id=deal_id,
            market_rent_growth=Decimal("0.03"),
            vacancy_rate=Decimal("0.05"),
            turnover_rate=Decimal("0.20"),
            avg_lease_term=12,
            lease_renewal_rate=Decimal("0.70"),
            marketing_cost_per_unit=Decimal("500"),
            turnover_cost_per_unit=Decimal("2000")
        )
        session.add(assumptions)
        session.commit()
        session.refresh(assumptions)
    
    return {
        "deal_id": deal_id,
        "pro_forma_rents": {k: float(v) for k, v in assumptions.pro_forma_rents.items()},
        "market_rent_growth": float(assumptions.market_rent_growth),
        "vacancy_rate": float(assumptions.vacancy_rate),
        "turnover_rate": float(assumptions.turnover_rate),
        "avg_lease_term": assumptions.avg_lease_term,
        "lease_renewal_rate": float(assumptions.lease_renewal_rate),
        "marketing_cost_per_unit": float(assumptions.marketing_cost_per_unit),
        "turnover_cost_per_unit": float(assumptions.turnover_cost_per_unit),
        "created_at": assumptions.created_at.isoformat(),
        "updated_at": assumptions.updated_at.isoformat()
    }


@router.post("/deals/{deal_id}/rentroll-assumptions")
async def update_rentroll_assumptions(
    deal_id: int,
    request: dict,
    session: Session = Depends(get_session)
) -> dict:
    """Update rent roll assumptions for a deal."""
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    try:
        # Get or create assumptions
        assumptions = session.exec(
            select(RentRollAssumptions).where(RentRollAssumptions.deal_id == deal_id)
        ).first()
        
        if not assumptions:
            assumptions = RentRollAssumptions(deal_id=deal_id)
            session.add(assumptions)
        
        # Update assumptions from request
        if "pro_forma_rents" in request:
            assumptions.pro_forma_rents = {
                k: Decimal(str(v)) for k, v in request["pro_forma_rents"].items()
            }
        
        if "market_rent_growth" in request:
            assumptions.market_rent_growth = Decimal(str(request["market_rent_growth"]))
        
        if "vacancy_rate" in request:
            assumptions.vacancy_rate = Decimal(str(request["vacancy_rate"]))
        
        if "turnover_rate" in request:
            assumptions.turnover_rate = Decimal(str(request["turnover_rate"]))
        
        if "avg_lease_term" in request:
            assumptions.avg_lease_term = int(request["avg_lease_term"])
        
        if "lease_renewal_rate" in request:
            assumptions.lease_renewal_rate = Decimal(str(request["lease_renewal_rate"]))
        
        if "marketing_cost_per_unit" in request:
            assumptions.marketing_cost_per_unit = Decimal(str(request["marketing_cost_per_unit"]))
        
        if "turnover_cost_per_unit" in request:
            assumptions.turnover_cost_per_unit = Decimal(str(request["turnover_cost_per_unit"]))
        
        session.commit()
        session.refresh(assumptions)
        
        # Update unit mix with pro forma rents
        if "pro_forma_rents" in request:
            from ..services.rentroll_normalization import get_rentroll_normalizer
            normalizer = get_rentroll_normalizer(session)
            normalizer._update_pro_forma_rents(deal_id, request["pro_forma_rents"])
        
        return {
            "success": True,
            "message": "Rent roll assumptions updated successfully",
            "assumptions": {
                "deal_id": deal_id,
                "pro_forma_rents": {k: float(v) for k, v in assumptions.pro_forma_rents.items()},
                "market_rent_growth": float(assumptions.market_rent_growth),
                "vacancy_rate": float(assumptions.vacancy_rate),
                "turnover_rate": float(assumptions.turnover_rate),
                "avg_lease_term": assumptions.avg_lease_term,
                "lease_renewal_rate": float(assumptions.lease_renewal_rate),
                "marketing_cost_per_unit": float(assumptions.marketing_cost_per_unit),
                "turnover_cost_per_unit": float(assumptions.turnover_cost_per_unit),
                "updated_at": assumptions.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating assumptions: {str(e)}")
