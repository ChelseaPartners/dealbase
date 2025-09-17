# DealBase System Workflow Documentation

## Executive Summary

This document provides a comprehensive audit of the DealBase system's end-to-end workflow for Rent Roll → Normalized Rent Roll → Unit Mix Summary → Valuation Engine pipeline.

## Current System Architecture

### Pages Present & Purposes

#### 1. Deal Page (`/deals/:id`)
- **Purpose**: Summary view with high-level metrics and navigation
- **Current State**: ✅ Clean summary visuals only
- **Contains**:
  - Historical Financials section (summary + CTA to `/deals/:id/financials`)
  - Unit Mix section (summary + CTA to `/deals/:id/unit-mix`)
  - Valuation section (CTA to `/deals/:id/valuation`)
  - Export and Upload Data actions

#### 2. Unit Mix Page (`/deals/:id/unit-mix`)
- **Purpose**: Combined unit mix visualization + source controls
- **Current State**: ✅ Recently updated with proper structure
- **Contains**:
  - Unit Mix Visualization (charts + summary metrics)
  - Rent Roll Dataset link (routes to `/deals/:id/rentroll`)
  - Inline NRR block (read-only table or empty state)
  - Source controls (Upload RR, Re-link RR, Manual Input)
  - Unit Mix Dataset table (editable when manual)

#### 3. Rent Roll Page (`/deals/:id/rentroll`)
- **Purpose**: Read-only NRR table + provenance
- **Current State**: ✅ Exists and functional
- **Contains**:
  - RentRollTable component with unit-level data
  - Export and refresh functionality
  - Empty state with upload CTA

#### 4. Valuation Page (`/deals/:id/valuation`)
- **Purpose**: Valuation engine interface
- **Current State**: ✅ Exists
- **Contains**: Valuation controls and results

### API Routes Analysis

#### Frontend API Routes (Next.js)
```
/api/deals
├── GET /api/deals - List all deals
├── POST /api/deals - Create deal
├── GET /api/deals/[id] - Get deal details
├── DELETE /api/deals/[id] - Delete deal
├── /api/deals/[id]/
│   ├── /rentroll - GET rent roll data
│   ├── /unit-mix - GET unit mix data
│   ├── /rentroll-assumptions - GET/PUT rent roll assumptions
│   └── /documents - Document management
└── /api/intake/rentroll/[id] - POST rent roll upload
```

#### Backend API Routes (FastAPI)
```
/api/
├── /deals - CRUD operations
├── /intake - Data upload and processing
├── /valuation - Valuation engine
├── /export - Export functionality
├── /unit-mix - Unit mix management
└── /health - Health checks
```

### Data Models Analysis

#### Core Models
1. **Deal** - Main deal entity
2. **RentRollNormalized** - Normalized rent roll data
3. **UnitMixSummary** - Aggregated unit mix data
4. **T12Normalized** - Historical financial data
5. **DealDocument** - Raw uploaded files
6. **ValuationRun** - Valuation results

#### Model Relationships
```
Deal (1) ←→ (N) RentRollNormalized
Deal (1) ←→ (N) UnitMixSummary
Deal (1) ←→ (N) T12Normalized
Deal (1) ←→ (N) DealDocument
Deal (1) ←→ (N) ValuationRun
```

### Current RR → NRR → UMS Workflow

#### 1. Upload Rent Roll
- **Frontend**: Upload modal in Deal page
- **API**: `POST /api/intake/rentroll/{deal_id}`
- **Backend**: `intake.py` → `save_document()` → `DealDocument` table
- **Status**: ✅ Working

#### 2. Normalize Rent Roll
- **API**: `POST /api/deals/{deal_id}/rentroll/{rr_id}/normalize`
- **Backend**: `deals.py` → marks as "completed"
- **Data**: Raw file → `RentRollNormalized` table
- **Status**: ⚠️ Partial - normalization logic placeholder

#### 3. Derive Unit Mix
- **API**: `POST /api/deals/{deal_id}/unit-mix/derive`
- **Backend**: `unit_mix.py` → `derive_unit_mix_from_nrr()`
- **Data**: `RentRollNormalized` → `UnitMixSummary` table
- **Status**: ✅ Working

#### 4. Link/Unlink Operations
- **Link**: `POST /api/deals/{deal_id}/unit-mix/link`
- **Unlink**: `POST /api/deals/{deal_id}/unit-mix/unlink`
- **Status**: ✅ Working

## Issues Identified & Fixed

### 1. ✅ FIXED: Duplicate Unit Mix Analysis
- **Issue**: Two different unit mix endpoints in deals.py and unit_mix.py
- **Fix**: Removed duplicate endpoint from deals.py, kept unit_mix.py as single source
- **Status**: COMPLETED

### 2. ✅ FIXED: Missing NRR API Endpoint
- **Issue**: Frontend expected `/api/deals/{deal_id}/rentroll/normalized` but didn't exist
- **Fix**: Added endpoint in deals.py with proper NRR data format
- **Status**: COMPLETED

### 3. ✅ FIXED: Valuation Engine Dependencies
- **Issue**: VE read from both T12 and RentRoll data directly
- **Fix**: Updated VE to only read from UnitMixSummary (UMS only rule)
- **Status**: COMPLETED

### 4. ⚠️ REMAINING: Rent Roll Normalization Logic
- **Issue**: Normalization endpoint exists but only marks as "completed"
- **Impact**: No actual data processing from raw file to NRR
- **Priority**: HIGH
- **Status**: PENDING (placeholder implementation)

## Recommended Fixes

### 1. Implement Rent Roll Normalization
```python
# In intake.py
@router.post("/intake/rentroll/{deal_id}/normalize")
async def normalize_rentroll(deal_id: int, session: Session = Depends(get_session)):
    # 1. Get raw file from DealDocument
    # 2. Process with pandas/normalization logic
    # 3. Save to RentRollNormalized table
    # 4. Update DealDocument status
```

### 2. Consolidate Unit Mix APIs
- **Keep**: `/api/deals/{deal_id}/unit-mix` (unit_mix.py) for CRUD operations
- **Remove**: Duplicate endpoint in deals.py
- **Add**: Comprehensive analysis as separate endpoint if needed

### 3. Add NRR API Endpoint
```python
# In deals.py
@router.get("/deals/{deal_id}/rentroll/normalized")
async def get_normalized_rentroll(deal_id: int, session: Session = Depends(get_session)):
    # Return RentRollNormalized data in expected format
```

### 4. Update Valuation Engine
- **Remove**: Direct RentRollNormalized queries
- **Use**: Only UnitMixSummary data
- **Add**: Validation that UnitMixSummary exists before valuation

## End-to-End Workflow

### Happy Path Example
1. **User uploads RR_X.xlsx** → `DealDocument` created (id: 123)
2. **Normalize rent roll** → `RentRollNormalized` populated (50 units) - *Placeholder*
3. **Derive unit mix** → `UnitMixSummary` created (3 unit types, version: 1)
4. **VE reads UMS** → Valuation run uses UnitMixSummary only ✅
5. **User views results** → All pages show consistent data

### Current Workflow Implementation

#### 1. Upload Rent Roll
```
Frontend: UploadModal → /api/intake/rentroll/{deal_id}
Backend: intake.py → save_document() → DealDocument table
Status: ✅ Working
```

#### 2. Normalize Rent Roll
```
API: POST /api/deals/{deal_id}/rentroll/{rr_id}/normalize
Backend: deals.py → marks as "completed" (placeholder)
Data: Raw file → RentRollNormalized table
Status: ⚠️ Placeholder only
```

#### 3. Derive Unit Mix
```
API: POST /api/deals/{deal_id}/unit-mix/derive
Backend: unit_mix.py → derive_unit_mix_from_nrr()
Data: RentRollNormalized → UnitMixSummary table
Status: ✅ Working
```

#### 4. Valuation Engine
```
API: POST /api/valuation/run/{deal_id}
Backend: valuation.py → reads T12 + UMS only
Data: T12Normalized + UnitMixSummary → ValuationRun
Status: ✅ Fixed (UMS only rule enforced)
```

### Edge Cases
1. **Multiple RRs**: Only latest normalized RR is used for UMS
2. **Unlink/Relink**: UMS becomes manual, can be re-linked
3. **No RR**: UMS must be manual entry only
4. **VE without UMS**: Shows error, requires UMS first ✅

## Dependencies Map

```
Frontend Components → API Routes → Backend Services → Database Models

DealDetailPageClient → /api/deals/[id] → deals.py → Deal
UnitMixPage → /api/deals/[id]/unit-mix → unit_mix.py → UnitMixSummary
RentRollPage → /api/deals/[id]/rentroll → deals.py → RentRollNormalized
ValuationPage → /api/valuation/run → valuation.py → ValuationRun

Data Flow:
UploadModal → /api/intake/rentroll → intake.py → DealDocument
Normalize → /api/deals/[id]/rentroll/normalize → deals.py → RentRollNormalized
Derive UMS → /api/deals/[id]/unit-mix/derive → unit_mix.py → UnitMixSummary
```

## Next Steps

1. **Implement rent roll normalization logic**
2. **Consolidate duplicate unit mix endpoints**
3. **Add missing NRR API endpoint**
4. **Update valuation engine to use UMS only**
5. **Add comprehensive error handling**
6. **Implement data validation and constraints**

## Conclusion

The system architecture is well-structured with clear separation of concerns. The main issues are around missing normalization logic and some API consolidation. The workflow is sound and follows the expected pattern of RR → NRR → UMS → VE.
