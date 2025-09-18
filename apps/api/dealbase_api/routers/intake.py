"""Data intake router."""

from typing import List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel
import pandas as pd
import numpy as np
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
    
    # Check for existing documents of this type for this deal
    existing_docs = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_type == file_type
        )
    ).all()
    
    # If there are existing documents, we'll keep them and add the new one
    # The user can manage duplicates through the UI
    if existing_docs:
        print(f"DEBUG: Found {len(existing_docs)} existing {file_type} documents for deal {deal_id}. Adding new document without deleting existing ones.")
    
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

def save_document_with_content(deal_id: int, file: UploadFile, content: bytes, file_type: str, session: Session) -> DealDocument:
    """Save uploaded file with provided content and create document record."""
    
    # Create uploads directory if it doesn't exist
    uploads_dir = Path(__file__).parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ""
    filename = f"deal_{deal_id}_{file_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = uploads_dir / filename
    
    # Calculate hash from provided content
    file_hash = hashlib.md5(content).hexdigest()
    
    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Check for existing documents of this type for this deal
    existing_docs = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_type == file_type
        )
    ).all()
    
    # If there are existing documents, we'll keep them and add the new one
    # The user can manage duplicates through the UI
    if existing_docs:
        print(f"DEBUG: Found {len(existing_docs)} existing {file_type} documents for deal {deal_id}. Adding new document without deleting existing ones.")
    
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
        try:
            df = pd.read_csv(io.BytesIO(content))
            print(f"DEBUG: CSV read successfully - {len(df)} rows, {len(df.columns)} columns")
            print(f"DEBUG: CSV columns: {list(df.columns)}")
        except Exception as e:
            print(f"DEBUG: CSV read failed: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(e)}")
    elif file.filename.endswith(('.xlsx', '.xls')):
        # Try different header positions to find the actual column headers
        df = None
        
        # Determine the appropriate engine based on file extension
        engine = 'openpyxl' if file.filename.endswith('.xlsx') else 'xlrd'
        
        # First, let's see what's in the first few rows
        print(f"DEBUG: Analyzing Excel file structure with engine={engine}...")
        for row_num in range(10):
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=row_num, nrows=1, engine=engine)
                print(f"DEBUG: Row {row_num} columns: {list(test_df.columns)}")
            except Exception as e:
                print(f"DEBUG: Failed to read row {row_num}: {e}")
                break
        
        # Now try to find the best header position
        for header_row in range(10):  # Try headers 0-9
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=header_row, engine=engine)
                
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
            df = pd.read_excel(io.BytesIO(content), engine=engine)
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
    
    # Parse based on file extension with improved header detection for rent roll
    if file.filename.endswith('.csv'):
        try:
            df = pd.read_csv(io.BytesIO(content))
            print(f"DEBUG: CSV read successfully - {len(df)} rows, {len(df.columns)} columns")
            print(f"DEBUG: CSV columns: {list(df.columns)}")
        except Exception as e:
            print(f"DEBUG: CSV read failed: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(e)}")
    elif file.filename.endswith(('.xlsx', '.xls')):
        # Use improved header detection for rent roll files
        df = None
        engine = 'openpyxl' if file.filename.endswith('.xlsx') else 'xlrd'
        
        print(f"DEBUG: Analyzing Excel file structure with engine={engine}...")
        for header_row in range(10):  # Try headers 0-9
            try:
                test_df = pd.read_excel(io.BytesIO(content), header=header_row, engine=engine)
                
                # Check if we found meaningful column names
                meaningful_cols = []
                for col in test_df.columns:
                    col_str = str(col).strip()
                    if (not col_str.startswith('Unnamed:') and 
                        col_str not in ['', 'nan', 'NaN', 'None'] and
                        len(col_str) > 1):
                        meaningful_cols.append(col_str)
                
                print(f"DEBUG: Header {header_row}: {len(meaningful_cols)} meaningful columns: {meaningful_cols[:5]}...")
                
                if len(meaningful_cols) >= 5:  # Need at least 5 meaningful columns for rent roll
                    df = test_df
                    print(f"DEBUG: ✅ Using header={header_row}, found {len(meaningful_cols)} meaningful columns")
                    print(f"DEBUG: Final columns: {list(df.columns)[:10]}...")
                    break
                    
            except Exception as e:
                print(f"DEBUG: Failed to read with header={header_row}: {e}")
                continue
        
        # If still no good columns found, use the original approach
        if df is None:
            print(f"DEBUG: ❌ No good header found, using default")
            df = pd.read_excel(io.BytesIO(content), engine=engine)
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
    """Upload and automatically process rent roll file."""
    print(f"DEBUG: Starting upload - deal_id: {deal_id}, filename: {file.filename}, content_type: {file.content_type}")
    
    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Validate file type
    allowed_extensions = ['.csv', '.xlsx', '.xls']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Supported formats: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (50MB limit)
    max_size = 50 * 1024 * 1024  # 50MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    print(f"DEBUG: File content size: {len(content)} bytes")
    
    # Check for duplicate uploads (idempotency)
    file_hash = hashlib.md5(content).hexdigest()
    existing_doc = session.exec(
        select(DealDocument).where(
            DealDocument.deal_id == deal_id,
            DealDocument.file_hash == file_hash,
            DealDocument.file_type == "rent_roll"
        )
    ).first()
    
    if existing_doc and existing_doc.processing_status == "completed":
        return {
            "success": True,
            "message": "File already processed successfully (duplicate upload detected)",
            "document_id": existing_doc.id,
            "filename": existing_doc.original_filename,
            "file_size": existing_doc.file_size,
            "records_processed": "already_processed",
            "issues_found": 0,
            "validation_passed": True,
            "processing_summary": {"duplicate_upload": True}
        }
    
    try:
        # Save the raw document with the content
        document = save_document_with_content(deal_id, file, content, "rent_roll", session)
        print(f"DEBUG: Saved document: {document.original_filename} -> {document.filename}")
        
        # Automatically start processing
        document.processing_status = "processing"
        document.processing_started_at = datetime.utcnow()
        session.commit()
        
        # Process the file using the new parser with retry logic
        from ..services.rentroll_parser import get_rentroll_parser
        
        max_retries = 3
        retry_count = 0
        result = None
        
        while retry_count < max_retries:
            try:
                parser = get_rentroll_parser(session)
                result = parser.parse_rentroll(deal_id, document.file_path)
                break  # Success, exit retry loop
                
            except Exception as e:
                retry_count += 1
                if retry_count >= max_retries:
                    raise e
                print(f"DEBUG: Processing attempt {retry_count} failed, retrying: {e}")
                # Wait before retry (exponential backoff)
                import time
                time.sleep(2 ** retry_count)
        
        # Check for parsing errors
        if result and "error" in result:
            document.processing_status = "failed"
            document.processing_error = result["error"]
            session.commit()
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to parse rent roll: {result['error']}"
            )
        
        # Persist to database with retry logic
        max_persistence_retries = 2
        persistence_retry_count = 0
        
        while persistence_retry_count < max_persistence_retries:
            try:
                parser.persist_to_database(deal_id, result['normalized_data'])
                break  # Success, exit retry loop
                
            except Exception as e:
                persistence_retry_count += 1
                if persistence_retry_count >= max_persistence_retries:
                    # Mark as failed if persistence fails after retries
                    document.processing_status = "failed"
                    document.processing_error = f"Failed to persist data after {max_persistence_retries} attempts: {str(e)}"
                    session.commit()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to save rent roll data: {str(e)}"
                    )
                print(f"DEBUG: Persistence attempt {persistence_retry_count} failed, retrying: {e}")
                # Wait before retry
                import time
                time.sleep(1)
        
        # Mark as completed
        document.processing_status = "completed"
        document.updated_at = datetime.utcnow()
        session.commit()
        
        return {
            "success": True,
            "message": "Rent roll uploaded and processed successfully",
            "document_id": document.id,
            "filename": document.original_filename,
            "file_size": document.file_size,
            "records_processed": len(result['normalized_data']),
            "issues_found": len(result['issues_report']),
            "validation_passed": len(result['validation_report']['errors']) == 0,
            "processing_summary": result['parsing_summary'],
            "retry_info": {
                "processing_retries": retry_count,
                "persistence_retries": persistence_retry_count
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Mark as failed for any other errors
        if 'document' in locals():
            document.processing_status = "failed"
            document.processing_error = str(e)
            session.commit()
        
        print(f"ERROR: Failed to process rent roll: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process rent roll: {str(e)}"
        )


@router.get("/intake/rentroll/{deal_id}/preview")
async def preview_rentroll_raw(
    deal_id: int,
    session: Session = Depends(get_session)
) -> dict:
    """Step 2: Preview raw rent roll data without any processing."""
    
    # Get the most recent rent roll document for this deal
    from sqlmodel import select
    document = session.exec(
        select(DealDocument)
        .where(DealDocument.deal_id == deal_id)
        .where(DealDocument.file_type == "rent_roll")
        .order_by(DealDocument.created_at.desc())
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="No rent roll document found for this deal")
    
    try:
        # Read the file content
        with open(document.file_path, 'rb') as f:
            content = f.read()
        
        # Parse based on file extension
        if document.original_filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif document.original_filename.endswith(('.xlsx', '.xls')):
            engine = 'openpyxl' if document.original_filename.endswith('.xlsx') else 'xlrd'
            df = pd.read_excel(io.BytesIO(content), engine=engine)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Convert to JSON-serializable format
        # Handle NaN and infinity values for JSON serialization
        df_clean = df.head(20).copy()
        
        # Replace NaN and infinity values with None for JSON serialization
        df_clean = df_clean.replace([float('inf'), float('-inf')], None)
        df_clean = df_clean.where(pd.notnull(df_clean), None)
        
        preview_data = df_clean.to_dict('records')
        
        # Convert numpy types to Python native types
        for record in preview_data:
            for key, value in record.items():
                if pd.isna(value):
                    record[key] = None
                elif isinstance(value, (np.integer, np.floating)):
                    record[key] = value.item()
                elif isinstance(value, np.ndarray):
                    record[key] = value.tolist()
        
        return {
            "success": True,
            "message": "Raw data preview generated successfully",
            "document_id": document.id,
            "filename": document.original_filename,
            "file_info": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": list(df.columns),
                "preview_rows": len(preview_data)
            },
            "preview_data": preview_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error reading file: {str(e)}",
            "error": str(e)
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
