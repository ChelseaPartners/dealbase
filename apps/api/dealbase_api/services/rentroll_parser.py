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
import re

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
    
    # Unit label priority order: "unit label", "floorplan", "plan", "unit type"
    UNIT_LABEL_COLUMNS = ['unit label', 'floorplan', 'plan', 'unit type']
    
    def __init__(self, session: Session):
        self.session = session
        self.issues: List[Dict[str, Any]] = []
        self.validation_errors: List[str] = []
        
    def parse_rentroll(self, deal_id: int, file_path: str) -> Dict[str, Any]:
        """
        Parse a rent roll file and return normalized data with robust error handling.
        
        Args:
            deal_id: Deal ID to associate with the rent roll
            file_path: Path to the rent roll file
            
        Returns:
            Dictionary containing:
            - normalized_data: List of normalized records
            - issues_report: List of issues found during parsing
            - validation_report: Validation results
            - metadata: Provenance and processing metadata
            - parsing_summary: Detailed summary of row filtering and processing
        """
        self.issues = []
        self.validation_errors = []
        self.parsing_summary = {
            'total_rows_read': 0,
            'rows_dropped': {
                'blank': 0,
                'header': 0,
                'total': 0,
                'applicant': 0,
                'missing_unit_number': 0,
                'duplicate_resolved': 0
            },
            'duplicate_resolution_examples': [],
            'final_unique_units': 0
        }
        
        try:
            # Step 1: Read the file with error handling
            try:
                df = self._read_file(file_path)
                self.parsing_summary['total_rows_read'] = len(df)
                
                if df.empty:
                    raise ValueError("File contains no data")
                    
                logger.info(f"Successfully read {len(df)} rows from {file_path}")
                
            except Exception as e:
                error_msg = f"Failed to read file {file_path}: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 2: Detect and map columns with fallbacks
            try:
                column_mapping = self._detect_columns(df)
                
                # Ensure we have at least unit_number and actual_rent
                if 'unit_number' not in column_mapping:
                    raise ValueError("Could not detect unit number column. Please ensure your file has a column containing unit identifiers.")
                
                if 'actual_rent' not in column_mapping and 'market_rent' not in column_mapping:
                    raise ValueError("Could not detect rent column. Please ensure your file has a column containing rent amounts.")
                    
                logger.info(f"Column mapping successful: {list(column_mapping.keys())}")
                
            except Exception as e:
                error_msg = f"Column detection failed: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 3: Filter out non-unit rows with error handling
            try:
                filtered_df = self._filter_non_unit_rows(df, column_mapping)
                
                if filtered_df.empty:
                    raise ValueError("No valid unit rows found after filtering. Please check your data format.")
                    
                logger.info(f"Filtered to {len(filtered_df)} valid unit rows")
                
            except Exception as e:
                error_msg = f"Row filtering failed: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 4: Normalize the data with error handling
            try:
                normalized_df = self._normalize_dataframe(filtered_df, column_mapping)
                logger.info(f"Normalized {len(normalized_df)} rows")
                
            except Exception as e:
                error_msg = f"Data normalization failed: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 5: Resolve duplicates with error handling
            try:
                deduplicated_df = self._resolve_duplicates(normalized_df)
                self.parsing_summary['final_unique_units'] = len(deduplicated_df)
                
                if deduplicated_df.empty:
                    raise ValueError("No valid units remaining after duplicate resolution")
                    
                logger.info(f"Resolved duplicates, {len(deduplicated_df)} unique units remaining")
                
            except Exception as e:
                error_msg = f"Duplicate resolution failed: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 6: Validate the data
            try:
                validation_report = self._validate_data(deduplicated_df)
                logger.info(f"Validation completed with {len(validation_report['errors'])} errors, {len(validation_report['warnings'])} warnings")
                
            except Exception as e:
                logger.warning(f"Validation failed: {str(e)}, continuing with basic validation")
                validation_report = {
                    'total_records': len(deduplicated_df),
                    'valid_records': len(deduplicated_df),
                    'invalid_records': 0,
                    'warnings': [f"Validation error: {str(e)}"],
                    'errors': []
                }
            
            # Step 7: Convert to records with error handling
            try:
                normalized_records = self._dataframe_to_records(deduplicated_df)
                logger.info(f"Converted to {len(normalized_records)} records")
                
            except Exception as e:
                error_msg = f"Record conversion failed: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Step 8: Generate metadata
            try:
                metadata = self._generate_metadata(deal_id, file_path, column_mapping, len(normalized_records))
                logger.info("Metadata generation completed")
                
            except Exception as e:
                logger.warning(f"Metadata generation failed: {str(e)}, using basic metadata")
                metadata = {
                    'deal_id': deal_id,
                    'source_file': str(file_path),
                    'parsed_at': datetime.utcnow().isoformat(),
                    'record_count': len(normalized_records),
                    'parser_version': '2.0.0'
                }
            
            # Convert all numpy types to Python native types for JSON serialization
            return {
                'normalized_data': self._convert_numpy_types(normalized_records),
                'issues_report': self._convert_numpy_types(self.issues),
                'validation_report': self._convert_numpy_types(validation_report),
                'metadata': self._convert_numpy_types(metadata),
                'parsing_summary': self._convert_numpy_types(self.parsing_summary)
            }
            
        except ValueError as e:
            # Re-raise ValueError as-is (these are user-friendly error messages)
            logger.error(f"Rent roll parsing failed: {e}")
            raise
        except Exception as e:
            # Catch any unexpected errors and provide a generic message
            error_msg = f"Unexpected error during rent roll processing: {str(e)}"
            logger.error(error_msg, exc_info=True)
            self.issues.append({
                'type': 'error',
                'message': error_msg,
                'severity': 'high'
            })
            raise ValueError("An unexpected error occurred while processing your rent roll. Please check your file format and try again.")
    
    def _filter_non_unit_rows(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Filter out non-unit rows: blanks, headers, totals, applicants, and rows without valid unit numbers.
        
        Args:
            df: Raw dataframe from file
            column_mapping: Detected column mapping
            
        Returns:
            Filtered dataframe containing only real unit rows
        """
        if df.empty:
            return df
            
        # Start with all rows
        mask = pd.Series([True] * len(df), index=df.index)
        
        # A) Exclude blank lines
        blank_mask = self._identify_blank_rows(df)
        mask = mask & ~blank_mask
        self.parsing_summary['rows_dropped']['blank'] = blank_mask.sum()
        
        # B) Exclude repeated header lines
        header_mask = self._identify_header_rows(df, column_mapping)
        mask = mask & ~header_mask
        self.parsing_summary['rows_dropped']['header'] = header_mask.sum()
        
        # C) Exclude totals/summary lines
        total_mask = self._identify_total_rows(df, column_mapping)
        mask = mask & ~total_mask
        self.parsing_summary['rows_dropped']['total'] = total_mask.sum()
        
        # D) Exclude applicants/future rows
        applicant_mask = self._identify_applicant_rows(df, column_mapping)
        mask = mask & ~applicant_mask
        self.parsing_summary['rows_dropped']['applicant'] = applicant_mask.sum()
        
        # E) Exclude rows without valid unit numbers
        unit_number_mask = self._identify_invalid_unit_numbers(df, column_mapping)
        mask = mask & ~unit_number_mask
        self.parsing_summary['rows_dropped']['missing_unit_number'] = unit_number_mask.sum()
        
        # Apply the mask
        filtered_df = df[mask].copy()
        
        # Log summary
        total_dropped = len(df) - len(filtered_df)
        self.issues.append({
            'type': 'info',
            'message': f"Filtered {total_dropped} non-unit rows: {self.parsing_summary['rows_dropped']}",
            'severity': 'low'
        })
        
        return filtered_df
    
    def _identify_blank_rows(self, df: pd.DataFrame) -> pd.Series:
        """Identify completely blank or nearly blank rows."""
        # Check if all values are NaN, empty strings, or whitespace
        blank_mask = df.isnull().all(axis=1)
        
        # Also check for rows where all values are empty strings or whitespace
        for col in df.columns:
            col_str = df[col].astype(str).str.strip()
            blank_mask = blank_mask | col_str.eq('')
        
        return blank_mask
    
    def _identify_header_rows(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.Series:
        """Identify repeated header rows based on common header patterns."""
        # Very specific header keywords that are unlikely to appear in actual data
        header_keywords = [
            'unit', 'apartment', 'apt', 'suite', 'number', 'no', '#',
            'rent', 'amount', 'price', 'lease', 'tenant', 'occupant',
            'square', 'sqft', 'sq_ft', 'size', 'start', 'end', 'expire', 'move'
        ]
        
        # Common data values that should never be considered headers
        data_values = [
            'occupied', 'vacant', 'applicant', 'pending', 'renewal',
            'bedroom', 'bathroom', 'bed', 'bath', 'br', 'ba',
            'studio', '1br', '2br', '3br', '4br', '5br',
            '1ba', '2ba', '3ba', '4ba', '5ba'
        ]
        
        header_mask = pd.Series([False] * len(df), index=df.index)
        
        # Only check columns that are likely to contain header-like values
        for col in df.columns:
            if col in df.columns:
                col_str = df[col].astype(str).str.lower().str.strip()
                
                # Skip if this column is mostly numeric (not likely to be headers)
                try:
                    numeric_count = pd.to_numeric(col_str, errors='coerce').notna().sum()
                    if numeric_count > len(df) * 0.8:  # If >80% numeric, skip
                        continue
                except:
                    pass
                
                # Check if this column contains mostly header-like values
                # But exclude common data values
                header_like = col_str.isin(header_keywords)
                data_like = col_str.isin(data_values)
                
                # Only consider it a header if it's header-like AND not data-like
                true_header_like = header_like & ~data_like
                
                if true_header_like.sum() > len(df) * 0.3:  # If >30% of values are true header keywords
                    header_mask = header_mask | true_header_like
        
        return header_mask
    
    def _identify_total_rows(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.Series:
        """Identify total/summary rows."""
        total_keywords = ['total', 'sum', 'subtotal', 'grand total', 'summary', 'count']
        
        total_mask = pd.Series([False] * len(df), index=df.index)
        
        for col in df.columns:
            if col in df.columns:
                col_str = df[col].astype(str).str.lower().str.strip()
                total_like = col_str.str.contains('|'.join(total_keywords), case=False, na=False)
                total_mask = total_mask | total_like
        
        # Also check for rows that look like aggregates (many numeric columns with similar values)
        if 'actual_rent' in column_mapping:
            rent_col = column_mapping['actual_rent']
            if rent_col in df.columns:
                # Check for rows where rent values are suspiciously round or high (potential totals)
                rent_values = pd.to_numeric(df[rent_col], errors='coerce')
                suspicious_rent = (rent_values % 1000 == 0) & (rent_values > 10000)  # Round thousands > 10k
                total_mask = total_mask | suspicious_rent
        
        return total_mask
    
    def _identify_applicant_rows(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.Series:
        """Identify applicant/future/pending rows."""
        applicant_keywords = ['applicant', 'pending', 'future', 'prospective', 'waiting', 'on hold', 'renewal']
        
        applicant_mask = pd.Series([False] * len(df), index=df.index)
        
        # Check status column for applicant keywords
        if 'lease_status' in column_mapping:
            status_col = column_mapping['lease_status']
            if status_col in df.columns:
                status_str = df[status_col].astype(str).str.lower().str.strip()
                applicant_mask = status_str.str.contains('|'.join(applicant_keywords), case=False, na=False)
        
        # Check for rows with zero rent (often indicates applicant/pending)
        if 'actual_rent' in column_mapping:
            rent_col = column_mapping['actual_rent']
            if rent_col in df.columns:
                rent_values = pd.to_numeric(df[rent_col], errors='coerce')
                zero_rent = (rent_values == 0) | rent_values.isna()
                applicant_mask = applicant_mask | zero_rent
        
        return applicant_mask
    
    def _identify_invalid_unit_numbers(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.Series:
        """Identify rows with invalid or missing unit numbers."""
        if 'unit_number' not in column_mapping:
            # If no unit number column detected, all rows are invalid
            return pd.Series([True] * len(df), index=df.index)
        
        unit_col = column_mapping['unit_number']
        if unit_col not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        
        unit_values = df[unit_col].astype(str).str.strip()
        
        # Invalid unit numbers: empty, 'nan', 'none', or just whitespace
        invalid_mask = (
            unit_values.isin(['', 'nan', 'none', 'null', 'n/a', 'na']) |
            unit_values.str.strip().eq('') |
            unit_values.isna()
        )
        
        return invalid_mask
    
    def _resolve_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Resolve duplicate unit numbers by keeping the best current record.
        
        Priority:
        1. Row with real in-place rent (not 0 or NaN)
        2. Row with lease period that includes today
        3. Row with most recent move-in/lease start
        """
        if 'unit_number' not in df.columns:
            return df
        
        # Group by unit number
        grouped = df.groupby('unit_number')
        resolved_rows = []
        
        for unit_num, group in grouped:
            if len(group) == 1:
                # No duplicates
                resolved_rows.append(group.iloc[0])
                continue
            
            # Multiple rows for same unit - apply resolution logic
            self.parsing_summary['rows_dropped']['duplicate_resolved'] += len(group) - 1
            
            # Priority 1: Real in-place rent (not 0 or NaN)
            if 'actual_rent' in group.columns:
                rent_values = pd.to_numeric(group['actual_rent'], errors='coerce')
                has_rent = (rent_values > 0) & rent_values.notna()
                
                if has_rent.any():
                    # Keep rows with real rent
                    candidates = group[has_rent]
                    if len(candidates) == 1:
                        resolved_rows.append(candidates.iloc[0])
                        self._log_duplicate_resolution(unit_num, "has real rent", group, candidates.iloc[0])
                        continue
                    else:
                        # Multiple rows with rent - check status to prefer occupied
                        if 'lease_status' in candidates.columns:
                            status_col = candidates['lease_status'].astype(str).str.lower()
                            occupied_mask = status_col.str.contains('occupied', case=False, na=False)
                            if occupied_mask.any():
                                occupied_candidates = candidates[occupied_mask]
                                if len(occupied_candidates) == 1:
                                    resolved_rows.append(occupied_candidates.iloc[0])
                                    self._log_duplicate_resolution(unit_num, "occupied with rent", group, occupied_candidates.iloc[0])
                                    continue
                else:
                    # No real rent, keep all candidates for next priority
                    candidates = group
            else:
                candidates = group
            
            # Priority 2: Lease period includes today (if we have lease dates)
            if 'lease_start' in group.columns and 'lease_expiration' in group.columns:
                today = pd.Timestamp.now().date()
                current_lease = []
                
                for _, row in candidates.iterrows():
                    start_date = pd.to_datetime(row['lease_start'], errors='coerce')
                    end_date = pd.to_datetime(row['lease_expiration'], errors='coerce')
                    
                    if pd.notna(start_date) and pd.notna(end_date):
                        if start_date.date() <= today <= end_date.date():
                            current_lease.append(row)
                
                if current_lease:
                    # Keep the most recent move-in date among current leases
                    if len(current_lease) == 1:
                        resolved_rows.append(current_lease[0])
                        self._log_duplicate_resolution(unit_num, "current lease", group, current_lease[0])
                        continue
                    else:
                        # Multiple current leases - pick most recent move-in
                        current_df = pd.DataFrame(current_lease)
                        if 'lease_start' in current_df.columns:
                            current_df['lease_start_date'] = pd.to_datetime(current_df['lease_start'], errors='coerce')
                            best_row = current_df.loc[current_df['lease_start_date'].idxmax()]
                            resolved_rows.append(best_row)
                            self._log_duplicate_resolution(unit_num, "most recent move-in", group, best_row)
                            continue
            
            # Priority 3: Most recent move-in/lease start
            if 'lease_start' in candidates.columns:
                candidates['lease_start_date'] = pd.to_datetime(candidates['lease_start'], errors='coerce')
                best_row = candidates.loc[candidates['lease_start_date'].idxmax()]
                resolved_rows.append(best_row)
                self._log_duplicate_resolution(unit_num, "most recent lease start", group, best_row)
            else:
                # No lease dates - just take the first one
                resolved_rows.append(candidates.iloc[0])
                self._log_duplicate_resolution(unit_num, "first occurrence", group, candidates.iloc[0])
        
        if resolved_rows:
            return pd.DataFrame(resolved_rows).reset_index(drop=True)
        else:
            return df
    
    def _log_duplicate_resolution(self, unit_num: str, reason: str, all_rows: pd.DataFrame, chosen_row: pd.Series):
        """Log duplicate resolution for diagnostics."""
        if len(self.parsing_summary['duplicate_resolution_examples']) < 5:
            self.parsing_summary['duplicate_resolution_examples'].append({
                'unit_number': unit_num,
                'total_candidates': len(all_rows),
                'resolution_reason': reason,
                'chosen_rent': chosen_row.get('actual_rent', 'N/A'),
                'chosen_lease_start': chosen_row.get('lease_start', 'N/A')
            })
    
    def _clean_unit_number(self, unit_str: str) -> str:
        """Clean unit number: remove decimals, preserve leading zeros."""
        if pd.isna(unit_str) or unit_str in ['', 'nan', 'none', 'null', 'n/a', 'na']:
            return ''
        
        # Convert to string and strip whitespace
        unit_str = str(unit_str).strip()
        
        # If it's a number with decimal, remove the decimal part
        try:
            # Try to parse as float first
            if '.' in unit_str:
                # Remove decimal part but preserve as string to keep leading zeros
                unit_str = unit_str.split('.')[0]
        except:
            pass
        
        return unit_str
    
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

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Detect and map columns based on patterns."""
        column_mapping = {}
        df_columns = [str(col).strip().lower() for col in df.columns]
        
        # Handle unit_label with priority order
        for priority_column in self.UNIT_LABEL_COLUMNS:
            for i, col in enumerate(df_columns):
                if col == priority_column and 'unit_label' not in column_mapping:
                    column_mapping['unit_label'] = df.columns[i]
                    self.issues.append({
                        'type': 'info',
                        'message': f"Detected unit_label column: '{df.columns[i]}' (priority: '{priority_column}')",
                        'severity': 'low'
                    })
                    break
            if 'unit_label' in column_mapping:
                break
        
        # Handle other columns with pattern matching
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
        
        # Unit number (required) - clean and normalize
        if 'unit_number' in column_mapping:
            unit_numbers = df[column_mapping['unit_number']].astype(str).str.strip()
            # Clean unit numbers: remove decimals, preserve leading zeros
            normalized_df['unit_number'] = unit_numbers.apply(self._clean_unit_number)
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
        
        # Unit label (floorplan, plan code, etc.) with validation
        if 'unit_label' in column_mapping:
            raw_values = df[column_mapping['unit_label']].astype(str).str.strip()
            # Clean and validate unit_label values
            normalized_df['unit_label'] = raw_values.apply(self._clean_unit_label)
            self.issues.append({
                'type': 'info',
                'message': f"Detected unit labels from column: '{column_mapping['unit_label']}'",
                'severity': 'low'
            })
        else:
            # Set unit_label to None if not found
            normalized_df['unit_label'] = None
        
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
    
    def _convert_numpy_types(self, obj):
        """Recursively convert numpy types to Python native types for JSON serialization."""
        if isinstance(obj, dict):
            return {key: self._convert_numpy_types(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy_types(item) for item in obj]
        elif isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.to_pydatetime()
        else:
            return obj
    
    def _generate_metadata(self, deal_id: int, file_path: str, column_mapping: Dict[str, str], record_count: int) -> Dict[str, Any]:
        """Generate metadata for provenance tracking."""
        return {
            'deal_id': deal_id,
            'source_file': str(file_path),
            'parsed_at': datetime.utcnow().isoformat(),
            'record_count': record_count,
            'column_mapping': column_mapping,
            'parser_version': '2.0.0',
            'issues_count': len(self.issues),
            'parsing_summary': self.parsing_summary
        }
    
    def persist_to_database(self, deal_id: int, normalized_records: List[Dict[str, Any]]) -> bool:
        """Persist normalized records to database with atomic transaction."""
        try:
            # Create a version timestamp for this update
            version_timestamp = datetime.utcnow()
            logger.info(f"Starting atomic persistence for deal {deal_id} at {version_timestamp}")
            
            # Use a savepoint for nested transaction safety
            savepoint = self.session.begin_nested()
            
            try:
                # Clear existing normalized data for this deal
                existing_records = self.session.query(RentRollNormalized).filter(
                    RentRollNormalized.deal_id == deal_id
                ).all()
                
                logger.info(f"Clearing {len(existing_records)} existing rent roll records for deal {deal_id}")
                for record in existing_records:
                    self.session.delete(record)
                
                # Clear existing unit mix data
                existing_unit_mix = self.session.query(UnitMixSummary).filter(
                    UnitMixSummary.deal_id == deal_id
                ).all()
                
                logger.info(f"Clearing {len(existing_unit_mix)} existing unit mix records for deal {deal_id}")
                for summary in existing_unit_mix:
                    self.session.delete(summary)
                
                # Insert new normalized records with validation
                logger.info(f"Inserting {len(normalized_records)} new rent roll records for deal {deal_id}")
                validated_count = 0
                
                for i, record in enumerate(normalized_records):
                    try:
                        # Validate required fields
                        if not record.get('unit_number'):
                            logger.warning(f"Skipping record {i}: missing unit_number")
                            continue
                            
                        if not record.get('actual_rent') and not record.get('market_rent'):
                            logger.warning(f"Skipping record {i}: missing rent data")
                            continue
                        
                        normalized_record = RentRollNormalized(
                            deal_id=deal_id,
                            unit_number=str(record.get('unit_number', '')),
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
                        validated_count += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to create record {i}: {e}")
                        continue
                
                if validated_count == 0:
                    raise ValueError("No valid records to insert after validation")
                
                # Commit the rent roll data
                savepoint.commit()
                self.session.commit()
                logger.info(f"Successfully committed {validated_count} rent roll records")
                
                # Generate unit mix summary in a separate transaction
                try:
                    self._generate_unit_mix_summary(deal_id, normalized_records)
                    logger.info(f"Successfully generated unit mix summary for deal {deal_id}")
                except Exception as e:
                    logger.error(f"Failed to generate unit mix summary: {e}")
                    # Don't fail the whole operation if unit mix generation fails
                    # The rent roll data is already committed
                
                # Update document status to completed
                try:
                    from ..models import DealDocument
                    document = self.session.query(DealDocument).filter(
                        DealDocument.deal_id == deal_id,
                        DealDocument.file_type == "rent_roll"
                    ).order_by(DealDocument.created_at.desc()).first()
                    
                    if document:
                        document.processing_status = "completed"
                        document.processing_completed_at = datetime.utcnow()
                        document.records_processed = len(records)
                        document.issues_found = issues_count
                        document.updated_at = version_timestamp
                        self.session.commit()
                        logger.info(f"Updated document {document.id} status to completed with {len(records)} records, {issues_count} issues")
                        
                except Exception as e:
                    logger.warning(f"Failed to update document status: {e}")
                    # Non-critical error
                
                logger.info(f"Atomic persistence completed successfully for deal {deal_id}")
                
            except Exception as e:
                # Rollback the savepoint
                savepoint.rollback()
                logger.error(f"Persistence failed, rolling back: {e}")
                raise
            
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
