"""
Clean, deterministic rent roll parser.

This module provides a robust rent roll parser that:
- Accepts CSV/XLS/XLSX files
- Normalizes data to our schema
- Returns validated dataset + issues report
- Persists as Normalized Rent Roll (NRR)
- Emits metadata for provenance
"""

import pandas as pd
import numpy as np
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
import io
import logging

from ..models import RentRollNormalized, UnitMixSummary, DealDocument
from ..database import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import select

logger = logging.getLogger(__name__)


class RentRollParser:
    """Clean, deterministic rent roll parser."""
    
    # Expected column patterns for auto-detection
    COLUMN_PATTERNS = {
        'unit_number': ['unit', 'apt', 'apartment', 'suite', 'number', 'no', '#'],
        'unit_type': ['type', 'bed', 'bedroom', 'br'],
        'square_feet': ['sqft', 'sq_ft', 'square', 'size', 'area', 'sf'],
        'bedrooms': ['bed', 'bedroom', 'br', 'beds'],
        'bathrooms': ['bath', 'bathroom', 'ba', 'baths'],
        'actual_rent': ['rent', 'actual', 'current', 'paid', 'amount', 'market'],
        'market_rent': ['market', 'asking', 'target', 'proforma', 'pro_forma'],
        'lease_start': ['start', 'begin', 'commence', 'move_in', 'movein'],
        'lease_expiration': ['end', 'expire', 'expiration', 'expiry', 'termination'],
        'tenant_name': ['tenant', 'name', 'occupant', 'resident', 'lessee'],
        'lease_status': ['status', 'occupied', 'vacant', 'available']
    }
    
    def __init__(self, session: Session):
        self.session = session
        self.issues: List[Dict[str, Any]] = []
        self.validation_errors: List[str] = []
        
    def parse_rentroll(self, deal_id: int, file_path: str) -> Dict[str, Any]:
        """
        Parse a rent roll file and return normalized data.
        
        Args:
            deal_id: Deal ID to associate with the rent roll
            file_path: Path to the rent roll file
            
        Returns:
            Dictionary containing:
            - normalized_data: List of normalized records
            - issues_report: List of issues found during parsing
            - validation_report: Validation results
            - metadata: Provenance and processing metadata
        """
        self.issues = []
        self.validation_errors = []
        
        try:
            # Read the file
            df = self._read_file(file_path)
            
            # Detect and map columns
            column_mapping = self._detect_columns(df)
            
            # Normalize the data
            normalized_df = self._normalize_dataframe(df, column_mapping)
            
            # Validate the data
            validation_report = self._validate_data(normalized_df)
            
            # Convert to records
            normalized_records = self._dataframe_to_records(normalized_df)
            
            # Generate metadata
            metadata = self._generate_metadata(deal_id, file_path, column_mapping, len(normalized_records))
            
            return {
                'normalized_data': normalized_records,
                'issues_report': self.issues,
                'validation_report': validation_report,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Error parsing rent roll: {e}")
            self.issues.append({
                'type': 'error',
                'message': f"Failed to parse rent roll: {str(e)}",
                'severity': 'high'
            })
            raise
    
    def _read_file(self, file_path: str) -> pd.DataFrame:
        """Read the rent roll file based on its extension."""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            if file_path.suffix.lower() == '.csv':
                # Try different encodings for CSV
                for encoding in ['utf-8', 'latin-1', 'cp1252']:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Could not decode CSV file with any supported encoding")
                    
            elif file_path.suffix.lower() in ['.xlsx', '.xls']:
                # Try different header rows for Excel
                df = None
                engine = 'openpyxl' if file_path.suffix.lower() == '.xlsx' else 'xlrd'
                
                for header_row in range(10):  # Try headers 0-9
                    try:
                        test_df = pd.read_excel(file_path, header=header_row, engine=engine)
                        
                        # Check if we found meaningful column names
                        meaningful_cols = self._count_meaningful_columns(test_df)
                        
                        if meaningful_cols >= 5:  # Need at least 5 meaningful columns
                            df = test_df
                            self.issues.append({
                                'type': 'info',
                                'message': f"Using header row {header_row} with {meaningful_cols} meaningful columns",
                                'severity': 'low'
                            })
                            break
                            
                    except Exception as e:
                        continue
                
                if df is None:
                    # Fallback to default header
                    df = pd.read_excel(file_path, engine=engine)
                    self.issues.append({
                        'type': 'warning',
                        'message': "Could not find optimal header row, using default",
                        'severity': 'medium'
                    })
            else:
                raise ValueError(f"Unsupported file format: {file_path.suffix}")
            
            # Clean the dataframe
            df = self._clean_dataframe(df)
            
            self.issues.append({
                'type': 'info',
                'message': f"Successfully read {len(df)} rows and {len(df.columns)} columns",
                'severity': 'low'
            })
            
            return df
            
        except Exception as e:
            raise ValueError(f"Failed to read file {file_path}: {str(e)}")
    
    def _count_meaningful_columns(self, df: pd.DataFrame) -> int:
        """Count meaningful (non-empty, non-unnamed) columns."""
        meaningful_cols = 0
        for col in df.columns:
            col_str = str(col).strip()
            if (not col_str.startswith('Unnamed:') and 
                col_str not in ['', 'nan', 'NaN', 'None'] and
                len(col_str) > 1):
                meaningful_cols += 1
        return meaningful_cols
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean the dataframe by removing empty rows and columns."""
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        # Remove completely empty columns
        df = df.dropna(axis=1, how='all')
        
        # Reset index
        df = df.reset_index(drop=True)
        
        return df
    
    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Detect and map columns based on patterns."""
        column_mapping = {}
        df_columns = [str(col).strip().lower() for col in df.columns]
        
        for target_col, patterns in self.COLUMN_PATTERNS.items():
            best_match = None
            best_score = 0
            
            for i, col in enumerate(df_columns):
                for pattern in patterns:
                    if pattern in col:
                        # Score based on pattern length and position
                        score = len(pattern) + (1 if col.startswith(pattern) else 0)
                        if score > best_score:
                            best_score = score
                            best_match = df.columns[i]
            
            if best_match:
                column_mapping[target_col] = best_match
                self.issues.append({
                    'type': 'info',
                    'message': f"Mapped {target_col} to column: '{best_match}'",
                    'severity': 'low'
                })
            else:
                self.issues.append({
                    'type': 'warning',
                    'message': f"Could not detect column for {target_col}",
                    'severity': 'medium'
                })
        
        return column_mapping
    
    def _normalize_dataframe(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.DataFrame:
        """Normalize the dataframe to our schema."""
        normalized_df = pd.DataFrame()
        
        # Unit number (required)
        if 'unit_number' in column_mapping:
            normalized_df['unit_number'] = df[column_mapping['unit_number']].astype(str).str.strip()
        else:
            # Generate unit numbers if not found
            normalized_df['unit_number'] = [f"Unit_{i+1}" for i in range(len(df))]
            self.issues.append({
                'type': 'warning',
                'message': "Unit numbers not detected, generated automatically",
                'severity': 'medium'
            })
        
        # Unit type (infer from bedrooms if available)
        if 'bedrooms' in column_mapping:
            bedrooms = pd.to_numeric(df[column_mapping['bedrooms']], errors='coerce').fillna(0)
            # Only use reasonable bedroom counts (0-5) for unit type inference
            bedrooms = bedrooms.apply(lambda x: x if 0 <= x <= 5 else 0)
            normalized_df['unit_type'] = bedrooms.apply(lambda x: f"{int(x)}BR" if x > 0 else "Studio")
        elif 'unit_type' in column_mapping:
            normalized_df['unit_type'] = df[column_mapping['unit_type']].astype(str).str.strip()
        else:
            # Try to infer from square footage if available
            if 'square_feet' in column_mapping:
                sqft = pd.to_numeric(df[column_mapping['square_feet']], errors='coerce')
                # Use square footage ranges to infer unit type
                normalized_df['unit_type'] = sqft.apply(self._infer_unit_type_from_sqft)
            else:
                normalized_df['unit_type'] = "Unknown"
        
        # Square feet
        if 'square_feet' in column_mapping:
            normalized_df['square_feet'] = pd.to_numeric(df[column_mapping['square_feet']], errors='coerce')
        else:
            normalized_df['square_feet'] = None
        
        # Bedrooms
        if 'bedrooms' in column_mapping:
            normalized_df['bedrooms'] = pd.to_numeric(df[column_mapping['bedrooms']], errors='coerce').fillna(0).astype(int)
        else:
            normalized_df['bedrooms'] = 0
        
        # Bathrooms
        if 'bathrooms' in column_mapping:
            normalized_df['bathrooms'] = pd.to_numeric(df[column_mapping['bathrooms']], errors='coerce')
        else:
            normalized_df['bathrooms'] = None
        
        # Actual rent (required)
        if 'actual_rent' in column_mapping:
            normalized_df['actual_rent'] = pd.to_numeric(df[column_mapping['actual_rent']], errors='coerce')
        else:
            normalized_df['actual_rent'] = 0
            self.issues.append({
                'type': 'error',
                'message': "Actual rent column not found, setting to 0",
                'severity': 'high'
            })
        
        # Market rent
        if 'market_rent' in column_mapping:
            normalized_df['market_rent'] = pd.to_numeric(df[column_mapping['market_rent']], errors='coerce')
        else:
            normalized_df['market_rent'] = normalized_df['actual_rent']
        
        # Lease dates
        if 'lease_start' in column_mapping:
            normalized_df['lease_start'] = pd.to_datetime(df[column_mapping['lease_start']], errors='coerce')
        else:
            normalized_df['lease_start'] = None
        
        if 'lease_expiration' in column_mapping:
            normalized_df['lease_expiration'] = pd.to_datetime(df[column_mapping['lease_expiration']], errors='coerce')
        else:
            normalized_df['lease_expiration'] = None
        
        # Tenant name
        if 'tenant_name' in column_mapping:
            normalized_df['tenant_name'] = df[column_mapping['tenant_name']].astype(str).str.strip()
        else:
            normalized_df['tenant_name'] = ""
        
        # Lease status
        if 'lease_status' in column_mapping:
            normalized_df['lease_status'] = df[column_mapping['lease_status']].astype(str).str.strip()
        else:
            # Infer from tenant name
            normalized_df['lease_status'] = normalized_df['tenant_name'].apply(
                lambda x: 'occupied' if x and x.lower() not in ['vacant', '', 'nan'] else 'vacant'
            )
        
        # Additional fields
        normalized_df['unit_label'] = normalized_df['unit_type']
        normalized_df['rent'] = normalized_df['actual_rent']  # For backward compatibility
        normalized_df['move_in_date'] = normalized_df['lease_start']
        normalized_df['is_duplicate'] = False
        normalized_df['is_application'] = False
        normalized_df['data_source'] = 'upload'
        
        return normalized_df
    
    def _validate_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate the normalized data and return validation report."""
        validation_report = {
            'total_records': len(df),
            'valid_records': 0,
            'invalid_records': 0,
            'warnings': [],
            'errors': []
        }
        
        # Check for required fields
        required_fields = ['unit_number', 'actual_rent']
        for field in required_fields:
            if field not in df.columns or df[field].isna().all():
                validation_report['errors'].append(f"Missing required field: {field}")
        
        # Validate unit numbers (should be unique)
        if 'unit_number' in df.columns:
            duplicates = df['unit_number'].duplicated()
            if duplicates.any():
                validation_report['warnings'].append(f"Found {duplicates.sum()} duplicate unit numbers")
        
        # Validate rent amounts (should be positive)
        if 'actual_rent' in df.columns:
            invalid_rent = (df['actual_rent'] <= 0) | df['actual_rent'].isna()
            if invalid_rent.any():
                validation_report['warnings'].append(f"Found {invalid_rent.sum()} records with invalid rent amounts")
        
        # Validate square feet (should be positive if present)
        if 'square_feet' in df.columns:
            invalid_sqft = (df['square_feet'] <= 0) & df['square_feet'].notna()
            if invalid_sqft.any():
                validation_report['warnings'].append(f"Found {invalid_sqft.sum()} records with invalid square footage")
        
        # Count valid records
        validation_report['valid_records'] = len(df) - validation_report['invalid_records']
        validation_report['invalid_records'] = len(df) - validation_report['valid_records']
        
        return validation_report
    
    def _dataframe_to_records(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert dataframe to list of records for database insertion."""
        records = []
        
        for _, row in df.iterrows():
            record = {}
            for key, value in row.items():
                if pd.isna(value):
                    record[key] = None
                elif isinstance(value, (np.integer, np.floating)):
                    record[key] = value.item()
                elif isinstance(value, pd.Timestamp):
                    record[key] = value.to_pydatetime()
                else:
                    record[key] = value
            records.append(record)
        
        return records
    
    def _generate_metadata(self, deal_id: int, file_path: str, column_mapping: Dict[str, str], record_count: int) -> Dict[str, Any]:
        """Generate metadata for provenance tracking."""
        return {
            'deal_id': deal_id,
            'source_file': str(file_path),
            'parsed_at': datetime.utcnow().isoformat(),
            'record_count': record_count,
            'column_mapping': column_mapping,
            'parser_version': '1.0.0',
            'issues_count': len(self.issues)
        }
    
    def persist_to_database(self, deal_id: int, normalized_records: List[Dict[str, Any]]) -> bool:
        """Persist normalized records to database."""
        try:
            # Clear existing normalized data for this deal
            existing_records = self.session.query(RentRollNormalized).filter(
                RentRollNormalized.deal_id == deal_id
            ).all()
            
            for record in existing_records:
                self.session.delete(record)
            
            # Insert new normalized records
            for record in normalized_records:
                normalized_record = RentRollNormalized(
                    deal_id=deal_id,
                    unit_number=record.get('unit_number', ''),
                    unit_label=record.get('unit_label', ''),
                    unit_type=record.get('unit_type', ''),
                    square_feet=self._safe_int(record.get('square_feet')),
                    bedrooms=self._safe_int(record.get('bedrooms')),
                    bathrooms=self._safe_float(record.get('bathrooms')),
                    rent=self._safe_decimal(record.get('rent')),
                    actual_rent=self._safe_decimal(record.get('actual_rent')),
                    market_rent=self._safe_decimal(record.get('market_rent')),
                    lease_start=self._safe_datetime(record.get('lease_start')),
                    move_in_date=self._safe_datetime(record.get('move_in_date')),
                    lease_expiration=self._safe_datetime(record.get('lease_expiration')),
                    tenant_name=record.get('tenant_name', ''),
                    lease_status=record.get('lease_status', ''),
                    is_duplicate=record.get('is_duplicate', False),
                    is_application=record.get('is_application', False),
                    data_source=record.get('data_source', 'upload')
                )
                
                self.session.add(normalized_record)
            
            self.session.commit()
            
            # Generate unit mix summary
            self._generate_unit_mix_summary(deal_id, normalized_records)
            
            return True
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error persisting to database: {e}")
            raise
    
    def _generate_unit_mix_summary(self, deal_id: int, normalized_records: List[Dict[str, Any]]) -> None:
        """Generate unit mix summary from normalized records."""
        try:
            # Clear existing unit mix data
            existing_summary = self.session.query(UnitMixSummary).filter(
                UnitMixSummary.deal_id == deal_id
            ).all()
            
            for summary in existing_summary:
                self.session.delete(summary)
            
            # Group by unit type
            unit_types = {}
            for record in normalized_records:
                unit_type = record.get('unit_type', 'Unknown')
                if unit_type not in unit_types:
                    unit_types[unit_type] = []
                unit_types[unit_type].append(record)
            
            # Create unit mix summary for each type
            for unit_type, records in unit_types.items():
                total_units = len(records)
                occupied_units = sum(1 for r in records if r.get('lease_status') == 'occupied')
                vacant_units = total_units - occupied_units
                
                # Calculate averages
                actual_rents = [r.get('actual_rent', 0) for r in records if r.get('actual_rent')]
                market_rents = [r.get('market_rent', 0) for r in records if r.get('market_rent')]
                square_feet = [r.get('square_feet', 0) for r in records if r.get('square_feet')]
                bedrooms = [r.get('bedrooms', 0) for r in records if r.get('bedrooms')]
                bathrooms = [r.get('bathrooms', 0) for r in records if r.get('bathrooms')]
                
                unit_mix = UnitMixSummary(
                    deal_id=deal_id,
                    unit_type=unit_type,
                    unit_label=unit_type,
                    total_units=total_units,
                    occupied_units=occupied_units,
                    vacant_units=vacant_units,
                    avg_square_feet=int(np.mean(square_feet)) if square_feet else None,
                    avg_bedrooms=float(np.mean(bedrooms)) if bedrooms else None,
                    avg_bathrooms=float(np.mean(bathrooms)) if bathrooms else None,
                    avg_actual_rent=Decimal(str(np.mean(actual_rents))) if actual_rents else Decimal('0'),
                    avg_market_rent=Decimal(str(np.mean(market_rents))) if market_rents else Decimal('0'),
                    rent_premium=Decimal('0'),  # Will be calculated
                    total_square_feet=int(np.sum(square_feet)) if square_feet else None,
                    total_actual_rent=Decimal(str(np.sum(actual_rents))) if actual_rents else Decimal('0'),
                    total_market_rent=Decimal(str(np.sum(market_rents))) if market_rents else Decimal('0'),
                    total_pro_forma_rent=Decimal('0'),  # Will be set by user
                    provenance='NRR',
                    is_linked_to_nrr=True,
                    rent_roll_name='Normalized Rent Roll',
                    last_derived_at=datetime.utcnow()
                )
                
                self.session.add(unit_mix)
            
            self.session.commit()
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error generating unit mix summary: {e}")
            raise
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int."""
        if pd.isna(value) or value is None:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float."""
        if pd.isna(value) or value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_decimal(self, value: Any) -> Decimal:
        """Safely convert value to Decimal."""
        if pd.isna(value) or value is None:
            return Decimal('0')
        try:
            return Decimal(str(value))
        except (ValueError, TypeError):
            return Decimal('0')
    
    def _safe_datetime(self, value: Any) -> Optional[datetime]:
        """Safely convert value to datetime."""
        if pd.isna(value) or value is None:
            return None
        try:
            if isinstance(value, pd.Timestamp):
                return value.to_pydatetime()
            elif isinstance(value, datetime):
                return value
            else:
                return pd.to_datetime(value).to_pydatetime()
        except (ValueError, TypeError):
            return None
    
    def _infer_unit_type_from_sqft(self, sqft: float) -> str:
        """Infer unit type from square footage."""
        if pd.isna(sqft) or sqft <= 0:
            return "Unknown"
        elif sqft < 500:
            return "Studio"
        elif sqft < 800:
            return "1BR"
        elif sqft < 1200:
            return "2BR"
        elif sqft < 1600:
            return "3BR"
        else:
            return "4BR+"


def get_rentroll_parser(session: Session) -> RentRollParser:
    """Factory function to create RentRollParser instance."""
    return RentRollParser(session)
