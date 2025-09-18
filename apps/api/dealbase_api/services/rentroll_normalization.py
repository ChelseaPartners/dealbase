"""Rent roll normalization and analysis services."""

import pandas as pd
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from sqlmodel import Session, select
from collections import defaultdict
import re

from ..models import Deal, RentRollNormalized, UnitMixSummary, RentRollAssumptions
from ..utils import log_audit_event


class RentRollNormalizer:
    """Service for normalizing and processing rent roll data."""
    
    # Column mapping patterns for auto-detection
    UNIT_NUMBER_PATTERNS = ['unit', 'apt', 'suite', 'number', 'unit_number', 'unit_num', 'unit number']
    UNIT_TYPE_PATTERNS = ['type', 'bedroom', 'bed', 'br', 'unit_type', 'unittype', 'unit type']
    # Unit label priority order: "unit label", "floorplan", "plan", "unit type"
    UNIT_LABEL_COLUMNS = ['unit label', 'floorplan', 'plan', 'unit type']
    SQUARE_FEET_PATTERNS = ['sqft', 'sf', 'square_feet', 'squareft', 'size', 'area', 'square feet']
    BEDROOM_PATTERNS = ['bedroom', 'bed', 'br', 'bedrooms', 'beds']
    BATHROOM_PATTERNS = ['bath', 'bathroom', 'ba', 'bathrooms']
    ACTUAL_RENT_PATTERNS = ['rent', 'current_rent', 'actual_rent', 'in_place', 'inplace', 'current', 'current rent']
    MARKET_RENT_PATTERNS = ['market', 'market_rent', 'proforma', 'pro_forma', 'target', 'market rent']
    LEASE_START_PATTERNS = ['lease_start', 'start_date', 'lease_begin', 'move_in', 'movein', 'lease start']
    LEASE_END_PATTERNS = ['lease_end', 'end_date', 'lease_exp', 'expiration', 'expire', 'lease end']
    TENANT_PATTERNS = ['tenant', 'resident', 'name', 'tenant_name', 'occupant', 'tenant name']
    
    def __init__(self, session: Session):
        self.session = session
    
    def normalize_rentroll_data(self, deal_id: int, df: pd.DataFrame) -> Dict[str, Any]:
        """Normalize raw rent roll data into structured format."""
        
        try:
            # Auto-detect column mappings
            column_mapping = self._auto_detect_columns(df)
            
            # Normalize and clean data
            normalized_df = self._normalize_dataframe(df, column_mapping)
            
            # Handle duplicates and applications
            cleaned_df = self._handle_duplicates_and_applications(normalized_df)
            
            # Validate data quality
            validation_report = self._validate_data_quality(cleaned_df)
            
            # Convert numpy types to Python native types for JSON serialization
            def convert_types(obj):
                """Convert numpy types to Python native types for JSON serialization."""
                if hasattr(obj, 'item'):  # numpy scalar
                    return obj.item()
                elif hasattr(obj, 'tolist'):  # numpy array
                    return obj.tolist()
                elif isinstance(obj, pd.Timestamp):
                    return obj.to_pydatetime()
                elif pd.isna(obj):
                    return None
                return obj
            
            # Convert the dataframes
            normalized_records = []
            for _, row in cleaned_df.iterrows():
                record = {}
                for key, value in row.items():
                    record[key] = convert_types(value)
                normalized_records.append(record)
            
            preview_records = []
            for _, row in cleaned_df.head(10).iterrows():
                record = {}
                for key, value in row.items():
                    record[key] = convert_types(value)
                preview_records.append(record)
            
            return {
                "normalized_data": normalized_records,
                "column_mapping": column_mapping,
                "validation_report": convert_types(validation_report),
                "preview_rows": preview_records
            }
        except Exception as e:
            # Return error information for debugging
            import traceback
            return {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "normalized_data": [],
                "column_mapping": {},
                "validation_report": {},
                "preview_rows": []
            }
    
    def _clean_unit_label(self, value: str) -> Optional[str]:
        """Clean and validate unit label according to mapping rules."""
        if pd.isna(value) or value in ['', 'nan', 'NaN', 'None']:
            return None
        
        # Trim whitespace and convert to uppercase
        cleaned = str(value).strip().upper()
        
        # Validate: allow [A-Z0-9-_] and length <= 16
        if len(cleaned) > 16:
            cleaned = cleaned[:16]
        
        # Check if contains only allowed characters
        if not re.match(r'^[A-Z0-9\-_]*$', cleaned):
            # Remove invalid characters
            cleaned = re.sub(r'[^A-Z0-9\-_]', '', cleaned)
        
        # Return None if empty after cleaning
        return cleaned if cleaned else None

    def _auto_detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Auto-detect column mappings using pattern matching."""
        mapping = {}
        columns_lower = [col.lower().strip() for col in df.columns]
        
        # Unit number detection
        for pattern in self.UNIT_NUMBER_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'unit_number' not in mapping:
                    mapping['unit_number'] = df.columns[i]
                    break
        
        # Unit type detection
        for pattern in self.UNIT_TYPE_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'unit_type' not in mapping:
                    mapping['unit_type'] = df.columns[i]
                    break
        
        # Unit label detection with priority order
        for priority_column in self.UNIT_LABEL_COLUMNS:
            for i, col in enumerate(columns_lower):
                if col == priority_column and 'unit_label' not in mapping:
                    mapping['unit_label'] = df.columns[i]
                    print(f"DEBUG: Mapped unit_label to column: '{df.columns[i]}' (priority: '{priority_column}')")
                    break
            if 'unit_label' in mapping:
                break
        
        # Square feet detection
        for pattern in self.SQUARE_FEET_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'square_feet' not in mapping:
                    mapping['square_feet'] = df.columns[i]
                    break
        
        # Bedroom detection
        for pattern in self.BEDROOM_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'bedrooms' not in mapping:
                    mapping['bedrooms'] = df.columns[i]
                    break
        
        # Bathroom detection
        for pattern in self.BATHROOM_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'bathrooms' not in mapping:
                    mapping['bathrooms'] = df.columns[i]
                    print(f"DEBUG: Mapped bathrooms to column: '{df.columns[i]}' (pattern: '{pattern}')")
                    break
        
        # Rent detection (prioritize actual/in-place rent)
        for pattern in self.ACTUAL_RENT_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'actual_rent' not in mapping:
                    mapping['actual_rent'] = df.columns[i]
                    break
        
        # Market rent detection
        for pattern in self.MARKET_RENT_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'market_rent' not in mapping:
                    mapping['market_rent'] = df.columns[i]
                    break
        
        # Lease start detection
        for pattern in self.LEASE_START_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'lease_start' not in mapping:
                    mapping['lease_start'] = df.columns[i]
                    break
        
        # Lease end detection
        for pattern in self.LEASE_END_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'lease_expiration' not in mapping:
                    mapping['lease_expiration'] = df.columns[i]
                    break
        
        # Tenant name detection
        for pattern in self.TENANT_PATTERNS:
            for i, col in enumerate(columns_lower):
                if pattern in col and 'tenant_name' not in mapping:
                    mapping['tenant_name'] = df.columns[i]
                    break
        
        print(f"DEBUG: Final column mapping: {mapping}")
        return mapping
    
    def _normalize_dataframe(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """Normalize dataframe with column mappings."""
        normalized_df = pd.DataFrame()
        
        # Map and normalize each field
        if 'unit_number' in mapping:
            normalized_df['unit_number'] = df[mapping['unit_number']].astype(str).str.strip()
        
        if 'unit_type' in mapping:
            normalized_df['unit_type'] = df[mapping['unit_type']].astype(str).str.strip()
        else:
            # Infer unit type from other fields if available
            normalized_df['unit_type'] = self._infer_unit_type(df, mapping)
        
        # Unit label mapping (floorplan, plan code, etc.) with validation
        if 'unit_label' in mapping:
            raw_values = df[mapping['unit_label']].astype(str).str.strip()
            # Clean and validate unit_label values
            normalized_df['unit_label'] = raw_values.apply(self._clean_unit_label)
        else:
            # Set unit_label to None if not found
            normalized_df['unit_label'] = None
        
        if 'square_feet' in mapping:
            normalized_df['square_feet'] = pd.to_numeric(df[mapping['square_feet']], errors='coerce').fillna(0)
        
        if 'bedrooms' in mapping:
            normalized_df['bedrooms'] = pd.to_numeric(df[mapping['bedrooms']], errors='coerce').fillna(0)
        else:
            # Create bedrooms column with default value if not detected
            normalized_df['bedrooms'] = 0
        
        if 'bathrooms' in mapping:
            normalized_df['bathrooms'] = pd.to_numeric(df[mapping['bathrooms']], errors='coerce').fillna(0)
        
        # Rent normalization (actual rent as primary)
        if 'actual_rent' in mapping:
            normalized_df['actual_rent'] = pd.to_numeric(df[mapping['actual_rent']], errors='coerce').fillna(0)
        elif 'market_rent' in mapping:
            # Use market rent as actual if no actual rent column
            normalized_df['actual_rent'] = pd.to_numeric(df[mapping['market_rent']], errors='coerce').fillna(0)
        else:
            normalized_df['actual_rent'] = 0
        
        if 'market_rent' in mapping:
            normalized_df['market_rent'] = pd.to_numeric(df[mapping['market_rent']], errors='coerce').fillna(0)
        else:
            # Set market rent to actual rent if not provided
            normalized_df['market_rent'] = normalized_df['actual_rent']
        
        # Date normalization
        if 'lease_start' in mapping:
            try:
                normalized_df['lease_start'] = pd.to_datetime(df[mapping['lease_start']], errors='coerce')
            except Exception:
                normalized_df['lease_start'] = None
        
        if 'lease_expiration' in mapping:
            try:
                normalized_df['lease_expiration'] = pd.to_datetime(df[mapping['lease_expiration']], errors='coerce')
            except Exception:
                normalized_df['lease_expiration'] = None
        
        if 'tenant_name' in mapping:
            normalized_df['tenant_name'] = df[mapping['tenant_name']].astype(str).str.strip()
        
        # Add derived fields
        normalized_df['move_in_date'] = normalized_df.get('lease_start', None)
        normalized_df['lease_status'] = 'occupied'
        normalized_df['is_duplicate'] = False
        normalized_df['is_application'] = False
        
        return normalized_df
    
    def _infer_unit_type(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.Series:
        """Infer unit type from bedroom count or other available data."""
        if 'bedrooms' in mapping:
            bedrooms = pd.to_numeric(df[mapping['bedrooms']], errors='coerce')
            return bedrooms.apply(lambda x: f"{int(float(x)) if pd.notna(x) else 0}BR" if pd.notna(x) else "Unknown")
        else:
            return pd.Series(["Unknown"] * len(df))
    
    def _handle_duplicates_and_applications(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle duplicate unit numbers and filter out applications/future move-ins."""
        
        # Identify duplicates based on unit number
        df['is_duplicate'] = df.duplicated(subset=['unit_number'], keep='first')
        
        # Filter out applications and future move-ins (only if lease_start column exists)
        current_date = datetime.now()
        if 'lease_start' in df.columns and 'tenant_name' in df.columns:
            df['is_application'] = (
                (df['lease_start'] > current_date) | 
                (df['lease_start'].isna() & df['tenant_name'].isna())
            )
        else:
            # If no lease_start column, just check for empty tenant names
            if 'tenant_name' in df.columns:
                df['is_application'] = df['tenant_name'].isna()
            else:
                df['is_application'] = False
        
        # Keep only occupied units with actual rent (drop duplicates and applications)
        cleaned_df = df[
            (~df['is_duplicate']) & 
            (~df['is_application']) & 
            (df['actual_rent'] > 0)
        ].copy()
        
        return cleaned_df
    
    def _validate_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate data quality and generate report."""
        total_rows = len(df)
        
        # Convert numpy types to Python native types
        def to_native(value):
            if hasattr(value, 'item'):
                return value.item()
            elif hasattr(value, 'tolist'):
                return value.tolist()
            return value
        
        return {
            "total_units": to_native(total_rows),
            "total_square_feet": to_native(df['square_feet'].sum()) if 'square_feet' in df.columns else 0,
            "total_actual_rent": to_native(df['actual_rent'].sum()),
            "total_market_rent": to_native(df['market_rent'].sum()),
            "average_rent": to_native(df['actual_rent'].mean()) if total_rows > 0 else 0,
            "data_quality": {
                "missing_unit_numbers": to_native(df['unit_number'].isna().sum()),
                "missing_rent": to_native((df['actual_rent'] == 0).sum()),
                "missing_square_feet": to_native(df['square_feet'].isna().sum()) if 'square_feet' in df.columns else 0,
                "invalid_dates": to_native(df['lease_expiration'].isna().sum()) if 'lease_expiration' in df.columns else 0,
                "duplicate_units_removed": to_native(df['is_duplicate'].sum()),
                "applications_removed": to_native(df['is_application'].sum())
            },
            "unit_type_breakdown": {str(k): to_native(v) for k, v in df['unit_type'].value_counts().to_dict().items()} if 'unit_type' in df.columns else {}
        }
    
    def commit_to_database(self, deal_id: int, normalized_data: List[Dict[str, Any]]) -> bool:
        """Commit normalized rent roll data to database."""
        try:
            # Clear existing rent roll data
            existing_data = self.session.exec(
                select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
            ).all()
            
            for record in existing_data:
                self.session.delete(record)
            
            # Insert new normalized data
            for row in normalized_data:
                # Parse date strings to datetime objects
                def parse_date(date_str):
                    if not date_str:
                        return None
                    if isinstance(date_str, str):
                        try:
                            return pd.to_datetime(date_str).to_pydatetime()
                        except:
                            return None
                    return date_str
                
                # Helper function to safely convert to int
                def safe_int(value):
                    if pd.isna(value) or value is None or value == '':
                        return None
                    try:
                        float_val = float(value)
                        if pd.isna(float_val):
                            return None
                        return int(float_val)
                    except (ValueError, TypeError):
                        return None
                
                # Helper function to safely convert to float
                def safe_float(value):
                    if pd.isna(value) or value is None:
                        return None
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        return None
                
                # Helper function to safely convert bathrooms (should be small integers)
                def safe_bathrooms(value):
                    if pd.isna(value) or value is None:
                        return None
                    try:
                        float_val = float(value)
                        # Bathrooms should be reasonable numbers (0-10)
                        if 0 <= float_val <= 10:
                            return int(float_val)
                        else:
                            print(f"WARNING: Invalid bathroom value {float_val}, setting to None")
                            return None
                    except (ValueError, TypeError):
                        return None
                
                # Helper function to safely convert dates, handling NaT values
                def safe_date(value):
                    if pd.isna(value) or value is None or value == '' or value == pd.NaT:
                        return None
                    try:
                        if hasattr(value, 'to_pydatetime'):
                            return value.to_pydatetime()
                        elif hasattr(value, 'date'):
                            return value.date()
                        else:
                            return pd.to_datetime(value).to_pydatetime()
                    except (ValueError, TypeError):
                        return None
                
                rentroll_record = RentRollNormalized(
                    deal_id=deal_id,
                    unit_number=str(row.get('unit_number', '')),
                    unit_label=row.get('unit_label'),
                    unit_type=row.get('unit_type', 'Unknown'),
                    square_feet=safe_int(row.get('square_feet')),
                    bedrooms=safe_int(row.get('bedrooms')),
                    bathrooms=safe_bathrooms(row.get('bathrooms')),
                    rent=Decimal(str(row.get('actual_rent', 0))),  # Populate old rent column
                    actual_rent=Decimal(str(row.get('actual_rent', 0))),
                    market_rent=Decimal(str(row.get('market_rent', 0))),
                    lease_start=safe_date(row.get('lease_start')),
                    move_in_date=safe_date(row.get('move_in_date')),
                    lease_expiration=safe_date(row.get('lease_expiration')),
                    tenant_name=row.get('tenant_name'),
                    lease_status=row.get('lease_status', 'occupied'),
                    is_duplicate=bool(row.get('is_duplicate', False)),
                    is_application=bool(row.get('is_application', False)),
                    data_source='upload'
                )
                self.session.add(rentroll_record)
            
            self.session.commit()
            
            # Generate unit mix summary
            self._generate_unit_mix_summary(deal_id)
            
            # Log audit event
            log_audit_event(
                deal_id=deal_id,
                event_type='rentroll_commit',
                description=f'Committed {len(normalized_data)} rent roll units',
                metadata={'units_committed': len(normalized_data)}
            )
            
            return True
            
        except Exception as e:
            self.session.rollback()
            raise e
    
    def _generate_unit_mix_summary(self, deal_id: int):
        """Generate unit mix summary from normalized rent roll data."""
        
        # Get the most recent rent roll document to get the filename
        from ..models import DealDocument
        rent_roll_doc = self.session.exec(
            select(DealDocument)
            .where(DealDocument.deal_id == deal_id)
            .where(DealDocument.file_type == "rent_roll")
            .order_by(DealDocument.created_at.desc())
        ).first()
        
        rent_roll_name = rent_roll_doc.original_filename if rent_roll_doc else None
        
        # Clear existing unit mix data
        existing_summary = self.session.exec(
            select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
        ).all()
        
        for record in existing_summary:
            self.session.delete(record)
        
        # Get normalized rent roll data
        rentroll_data = self.session.exec(
            select(RentRollNormalized).where(RentRollNormalized.deal_id == deal_id)
        ).all()
        
        # Group by unit type
        unit_type_groups = defaultdict(list)
        for unit in rentroll_data:
            unit_type_groups[unit.unit_type].append(unit)
        
        # Create unit mix summary for each type
        for unit_type, units in unit_type_groups.items():
            total_units = len(units)
            occupied_units = len([u for u in units if u.lease_status.lower() == 'occupied'])
            vacant_units = total_units - occupied_units
            
            # Calculate averages
            avg_sqft = sum(u.square_feet for u in units if u.square_feet) / total_units if total_units > 0 else 0
            avg_bedrooms = sum(u.bedrooms for u in units if u.bedrooms) / total_units if total_units > 0 else 0
            avg_bathrooms = sum(u.bathrooms for u in units if u.bathrooms) / total_units if total_units > 0 else 0
            avg_actual_rent = sum(u.actual_rent for u in units) / total_units if total_units > 0 else 0
            avg_market_rent = sum(u.market_rent for u in units) / total_units if total_units > 0 else 0
            
            # Calculate totals
            total_sqft = sum(u.square_feet for u in units if u.square_feet)
            total_actual_rent = sum(u.actual_rent for u in units)
            total_market_rent = sum(u.market_rent for u in units)
            
            # Rent premium (actual vs market)
            rent_premium = avg_actual_rent - avg_market_rent if avg_market_rent > 0 else 0
            
            unit_mix = UnitMixSummary(
                deal_id=deal_id,
                unit_type=unit_type,
                unit_label=unit_type,  # Default label
                total_units=total_units,
                occupied_units=occupied_units,
                vacant_units=vacant_units,
                avg_square_feet=int(float(avg_sqft)) if avg_sqft else None,
                avg_bedrooms=avg_bedrooms if avg_bedrooms else None,
                avg_bathrooms=avg_bathrooms if avg_bathrooms else None,
                avg_actual_rent=Decimal(str(avg_actual_rent)),
                avg_market_rent=Decimal(str(avg_market_rent)),
                rent_premium=Decimal(str(rent_premium)),
                total_square_feet=int(float(total_sqft)) if total_sqft else None,
                total_actual_rent=Decimal(str(total_actual_rent)),
                total_market_rent=Decimal(str(total_market_rent)),
                total_pro_forma_rent=Decimal(str(total_market_rent)),  # Default to market rent
                provenance="NRR",
                is_linked_to_nrr=True,
                rent_roll_name=rent_roll_name,
                last_derived_at=datetime.utcnow()
            )
            
            self.session.add(unit_mix)
        
        self.session.commit()
    
    def _update_pro_forma_rents(self, deal_id: int, pro_forma_rents: Dict[str, float]):
        """Update pro forma rents in unit mix summary."""
        unit_mix_data = self.session.exec(
            select(UnitMixSummary).where(UnitMixSummary.deal_id == deal_id)
        ).all()
        
        for unit_mix in unit_mix_data:
            if unit_mix.unit_type in pro_forma_rents:
                unit_mix.pro_forma_rent = Decimal(str(pro_forma_rents[unit_mix.unit_type]))
                unit_mix.total_pro_forma_rent = unit_mix.pro_forma_rent * unit_mix.total_units
                unit_mix.updated_at = datetime.utcnow()
        
        self.session.commit()


def get_rentroll_normalizer(session: Session) -> RentRollNormalizer:
    """Factory function to create RentRollNormalizer instance."""
    return RentRollNormalizer(session)
