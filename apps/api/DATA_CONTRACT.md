# DealBase Data Contract

## Overview
This document defines the data contract for the DealBase rent roll upload → process → load → Unit Mix pipeline.

## Core Data Models

### 1. DealDocument
**Purpose**: Stores raw uploaded files with processing metadata
**Key Fields**:
- `deal_id`: Foreign key to Deal (CASCADE DELETE)
- `file_hash`: MD5 hash for deduplication and idempotency
- `processing_status`: pending → processing → completed/failed
- `processing_error`: Error message if processing fails

**Data Contract**:
- Files are stored with unique generated filenames
- Original filename preserved for display
- File hash enables duplicate detection
- Processing status tracks pipeline state
- Failed uploads can be retried safely

### 2. RentRollNormalized
**Purpose**: Stores processed, validated unit-level rent roll data
**Key Fields**:
- `deal_id`: Foreign key to Deal (CASCADE DELETE)
- `unit_number`: Primary unit identifier (indexed)
- `unit_label`: Floor plan label from source data (nullable)
- `actual_rent`: Current rent being paid (required)
- `market_rent`: Market rate for unit (defaults to actual_rent)
- `data_source`: Source tracking (upload/manual_entry/import)

**Data Contract**:
- One record per unique unit per deal
- Unit numbers must be unique within a deal
- Rent amounts are stored as Decimal for precision
- Unit labels are preserved from source data
- Data quality flags track processing decisions

### 3. UnitMixSummary
**Purpose**: Aggregated unit mix data with provenance tracking
**Key Fields**:
- `deal_id`: Foreign key to Deal (CASCADE DELETE)
- `provenance`: Data source (NRR/MANUAL)
- `is_linked_to_nrr`: Whether data is derived from rent roll
- `last_derived_at`: Timestamp of last derivation
- `last_manual_edit_at`: Timestamp of last manual edit

**Data Contract**:
- Always reflects current state of underlying data
- Provenance tracks data lineage
- Manual edits break NRR linkage
- Aggregated metrics are calculated, not stored redundantly

## Pipeline Data Flow

### Upload Stage
1. File validation (type, size, format)
2. Hash calculation for deduplication
3. Document record creation with "pending" status
4. File storage with unique filename

### Processing Stage
1. Column detection and mapping
2. Data normalization and cleaning
3. Duplicate resolution
4. Validation and error reporting

### Persistence Stage
1. Atomic transaction with savepoints
2. Clear existing data for deal
3. Insert new normalized records
4. Generate unit mix summary
5. Update document status to "completed"

### Unit Mix Binding
1. Direct query of RentRollNormalized table
2. Real-time aggregation by grouping mode
3. Automatic refresh on data changes
4. No caching to ensure data freshness

## Data Integrity Rules

### Foreign Key Constraints
- All tables reference `deals.id` with CASCADE DELETE
- Ensures data cleanup when deals are deleted
- Prevents orphaned records

### Unique Constraints
- `unit_number` must be unique within a deal
- `file_hash` enables deduplication per deal
- Document processing is idempotent

### Data Validation
- Unit numbers are required and non-empty
- Rent amounts must be positive numbers
- Unit labels are optional but preserved when available
- Processing status follows strict state machine

## Error Handling

### Upload Errors
- File type validation with clear error messages
- Size limits with helpful suggestions
- Duplicate detection with idempotent response

### Processing Errors
- Column detection failures with fallback strategies
- Data validation with detailed error reporting
- Retry logic with exponential backoff

### Persistence Errors
- Atomic transactions with rollback on failure
- Partial write prevention
- Error logging with context

## Performance Considerations

### Indexing Strategy
- `deal_id` indexed on all related tables
- `unit_number` indexed for fast lookups
- `processing_status` indexed for status queries

### Query Optimization
- Direct table queries avoid stale cache
- Aggregation happens at query time
- No unnecessary joins in hot paths

### Storage Efficiency
- File deduplication by hash
- Compressed storage for large files
- Cleanup of failed uploads

## Security and Privacy

### Data Access
- Deal-scoped access control
- No cross-deal data leakage
- Audit logging for data changes

### File Handling
- Secure file upload with validation
- Virus scanning for uploaded files
- Temporary file cleanup

## Monitoring and Observability

### Metrics
- Upload success/failure rates
- Processing time distribution
- Data quality metrics
- Error frequency by type

### Logging
- Structured logging with context
- Error tracking with stack traces
- Performance metrics
- Data lineage tracking

## Migration and Versioning

### Schema Evolution
- Backward-compatible field additions
- Deprecation notices for old fields
- Migration scripts for data updates

### Data Versioning
- Timestamps on all records
- Change tracking for audit trails
- Rollback capabilities for failed updates

## Testing Strategy

### Unit Tests
- Data model validation
- Business logic testing
- Error condition handling

### Integration Tests
- End-to-end pipeline testing
- Database transaction testing
- File upload/processing testing

### Performance Tests
- Large file handling
- Concurrent upload testing
- Database query performance

## Troubleshooting Guide

### Common Issues
1. **Upload Fails**: Check file type, size, and format
2. **Processing Fails**: Verify data has required columns
3. **Unit Mix Empty**: Check rent roll data exists and is valid
4. **Stale Data**: Ensure no caching, refresh page

### Debug Information
- Processing logs with detailed error messages
- Data validation reports
- Column mapping results
- Retry attempt tracking

## Future Enhancements

### Planned Features
- Batch upload processing
- Real-time data validation
- Advanced error recovery
- Data quality scoring

### Scalability Improvements
- Async processing queue
- Distributed file storage
- Database sharding
- Caching layer for reads
