# Optimized Build Specification: Intake → Normalize → First-Run Loop (MVP)

## Current State Analysis

### ✅ Already Implemented
- **Backend Infrastructure**: FastAPI with SQLModel, SQLite database
- **Data Models**: Deal, T12Normalized, RentRollNormalized, ValuationRun, AuditEvent
- **Basic Intake Endpoints**: POST `/intake/t12/{deal_id}` and POST `/intake/rentroll/{deal_id}`
- **Valuation Engine**: Basic KPI calculations (IRR, DSCR, Cap Rate, etc.)
- **Frontend Foundation**: Next.js with React Query, intake upload UI
- **Component Library**: KPICard, AnalyticsDashboard, DealCard components
- **Type System**: Comprehensive TypeScript types in shared package

### 🔧 Gaps to Address
- **Preview/Mapping System**: Current intake immediately saves to DB; needs preview step
- **Auto-mapping Logic**: Basic column validation exists but no intelligent mapping
- **Commit Workflow**: No separation between preview and commit phases
- **Vault Summary API**: Missing monthly EGI/OpEx/NOI aggregation endpoint
- **Deal Detail Integration**: Placeholder sections need real data integration
- **Audit Trail**: Models exist but not integrated into workflow

---

## Optimized Build Plan

### Phase 1: Enhanced Intake System (3-4 days)

#### 1.1 Backend API Enhancements
**New Endpoints:**
```python
# Preview endpoints (no DB writes)
POST /intake/t12/preview → { previewRows, mapping, confidence, suggestions }
POST /intake/rentroll/preview → { previewRows, mapping, confidence, suggestions }

# Commit endpoint (writes to vault)
POST /intake/commit → { dealId, t12Mapping?, rrMapping?, commitBoth }

# Vault summary endpoint
GET /deals/{id}/vault/summary → { monthly: [{period, egi, opex, noi}] }
```

**Enhanced Services:**
```python
# New service functions
def auto_map_columns(df: pd.DataFrame, data_type: str) -> ColumnMapping
def validate_mapping(df: pd.DataFrame, mapping: ColumnMapping) -> ValidationResult
def preview_normalized_data(df: pd.DataFrame, mapping: ColumnMapping) -> PreviewResult
def commit_to_vault(deal_id: int, t12_data?, rr_data?) -> CommitResult
def summarize_vault(deal_id: int) -> VaultSummary
```

#### 1.2 Auto-Mapping Intelligence
**Column Mapping Logic:**
```python
T12_COLUMN_PATTERNS = {
    'month': ['month', 'mth', 'period', 'mo'],
    'year': ['year', 'yr', 'date'],
    'gross_rent': ['gross_rent', 'gross_income', 'rental_income', 'total_rent'],
    'other_income': ['other_income', 'misc_income', 'additional_income'],
    'operating_expenses': ['opex', 'operating_expenses', 'expenses', 'total_expenses']
}

RENTROLL_COLUMN_PATTERNS = {
    'unit_number': ['unit', 'unit_number', 'apt', 'suite'],
    'rent': ['rent', 'rental_rate', 'monthly_rent', 'base_rent'],
    'unit_type': ['type', 'unit_type', 'bedroom', 'bed'],
    'square_feet': ['sqft', 'square_feet', 'sf', 'size']
}
```

**Confidence Scoring:**
- Exact match: 100%
- Fuzzy match (>80% similarity): 80%
- Partial match: 60%
- Manual mapping required: 0%

#### 1.3 Frontend Wizard Enhancement
**Multi-Step Wizard:**
```typescript
// New wizard steps
interface WizardStep {
  id: 'upload' | 'review_mapping' | 'preview_data' | 'commit_run'
  title: string
  component: React.ComponentType
}

// Enhanced upload component with preview
interface UploadResult {
  previewRows: any[]
  mapping: ColumnMapping
  confidence: number
  suggestions: string[]
}
```

### Phase 2: Valuation Integration (2-3 days)

#### 2.1 Enhanced Valuation Engine
**Data-Driven Valuation Functions:**
```python
def derive_assumptions_from_data(deal_id: int) -> Dict[str, Any]:
    """Derive assumptions from uploaded T-12 and Rent Roll data"""
    t12_data = get_t12_data(deal_id)
    rentroll_data = get_rentroll_data(deal_id)
    
    # Calculate derived assumptions
    assumptions = {
        # From Rent Roll
        "unit_count": len(rentroll_data),
        "total_square_feet": sum(unit.square_feet or 0 for unit in rentroll_data),
        "average_rent": sum(unit.rent for unit in rentroll_data) / len(rentroll_data),
        
        # From T-12
        "annual_noi": sum(month.net_operating_income for month in t12_data) / len(t12_data) * 12,
        "annual_egi": sum(month.total_income for month in t12_data) / len(t12_data) * 12,
        
        # Derived financial assumptions
        "purchase_price": (sum(month.net_operating_income for month in t12_data) / len(t12_data) * 12) / 0.055,
        "loan_amount": ((sum(month.net_operating_income for month in t12_data) / len(t12_data) * 12) / 0.055) * 0.8,
        "expense_ratio": 1 - (sum(month.net_operating_income for month in t12_data) / sum(month.total_income for month in t12_data)),
        
        # Market defaults (can be overridden)
        "interest_rate": 0.05,
        "exit_cap_rate": 0.055,
        "hold_period": 5,
        "vacancy_rate": 0.05,
    }
    return assumptions

def compile_valuation_inputs(deal_id: int, override_assumptions: dict = None) -> CompiledInputs:
    """Compile normalized data + derived assumptions into valuation inputs"""
    derived_assumptions = derive_assumptions_from_data(deal_id)
    
    # Override with user-provided assumptions where specified
    if override_assumptions:
        derived_assumptions.update(override_assumptions)
    
    return CompiledInputs(
        deal_id=deal_id,
        t12_data=get_t12_data(deal_id),
        rentroll_data=get_rentroll_data(deal_id),
        assumptions=derived_assumptions
    )
    
def run_valuation_engine(compiled_inputs: CompiledInputs) -> ResultBundle:
    """Pure function that runs valuation calculations with data-derived assumptions"""
    
def calculate_kpis(t12_data, rentroll_data, assumptions) -> KPIs:
    """Calculate all KPIs from normalized data and derived assumptions"""
```

**Data-Driven Assumptions (Derived from Upload):**
```python
def derive_assumptions_from_data(deal_id: int, t12_data: List[T12Normalized], rentroll_data: List[RentRollNormalized]) -> Dict[str, Any]:
    """Derive valuation assumptions from uploaded data"""
    
    # From Rent Roll Data
    unit_count = len(rentroll_data)
    total_square_feet = sum(unit.square_feet or 0 for unit in rentroll_data)
    avg_unit_sf = total_square_feet / unit_count if unit_count > 0 else 0
    avg_rent = sum(unit.rent for unit in rentroll_data) / unit_count if unit_count > 0 else 0
    total_potential_rent = sum(unit.market_rent or unit.rent for unit in rentroll_data)
    
    # From T-12 Data  
    monthly_noi = [month.net_operating_income for month in t12_data]
    annual_noi = sum(monthly_noi) / len(monthly_noi) * 12 if monthly_noi else 0
    monthly_egi = [month.total_income for month in t12_data]
    annual_egi = sum(monthly_egi) / len(monthly_egi) * 12 if monthly_egi else 0
    
    # Derived Assumptions
    assumptions = {
        # Data-derived parameters
        "unit_count": unit_count,
        "total_square_feet": total_square_feet,
        "average_unit_sf": avg_unit_sf,
        "average_rent": avg_rent,
        "total_potential_rent": total_potential_rent,
        "annual_noi": annual_noi,
        "annual_egi": annual_egi,
        
        # Calculated financial parameters
        "purchase_price": annual_noi / 0.055,  # Cap rate of 5.5%
        "loan_amount": (annual_noi / 0.055) * 0.8,  # 80% LTV
        "cap_rate": 0.055,  # Derived from market
        "expense_ratio": (annual_egi - annual_noi) / annual_egi if annual_egi > 0 else 0.35,
        
        # Market assumptions (still defaults, but can be overridden)
        "interest_rate": 0.05,
        "exit_cap_rate": 0.055,
        "hold_period": 5,
        "vacancy_rate": 0.05,
    }
    
    return assumptions
```

#### 2.2 Deal Detail Integration
**Enhanced Deal Detail Page:**
```typescript
// New components
interface DealDetailData {
  deal: Deal
  vaultSummary: VaultSummary
  latestValuation: ValuationRun
  kpis: KPIs
  noiChart: ChartData
}

// KPI Rail Component
function KPIRail({ kpis }: { kpis: KPIs }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard title="IRR" value={kpis.irr} format="percentage" />
      <KPICard title="DSCR" value={kpis.dscr} format="decimal" />
      <KPICard title="Cap Rate" value={kpis.cap_rate} format="percentage" />
      <KPICard title="NOI" value={kpis.noi} format="currency" />
    </div>
  )
}
```

### Phase 3: Workflow Integration (2 days)

#### 3.1 Commit & Run Workflow
**Data-Driven Single Action Flow:**
```typescript
async function commitAndRun(dealId: string, t12Mapping?, rrMapping?) {
  // 1. Commit to vault
  await commitIntake(dealId, t12Mapping, rrMapping)
  
  // 2. Derive assumptions from uploaded data
  const derivedAssumptions = await deriveAssumptionsFromData(dealId)
  
  // 3. Run valuation with data-derived assumptions
  const valuation = await runValuation(dealId, derivedAssumptions)
  
  // 4. Update deal properties with derived data
  await updateDealProperties(dealId, {
    unit_count: derivedAssumptions.unit_count,
    nsf: derivedAssumptions.average_unit_sf,
    // Update other deal fields with derived data
  })
  
  // 5. Redirect to deal detail with results
  router.push(`/deals/${dealId}`)
}
```

#### 3.2 Audit Integration
**Audit Events:**
```python
def log_audit_event(deal_id: int, event_type: str, description: str, metadata: dict):
    """Log audit event for compliance tracking"""
    
# Events to track:
# - intake_preview
# - intake_commit  
# - valuation_run
# - mapping_updated
```

#### 3.3 Mapping Persistence
**Store Mapping Config:**
```python
class MappingConfig(SQLModel, table=True):
    deal_id: int
    data_type: str  # 't12' or 'rentroll'
    column_mapping: dict
    created_at: datetime
    updated_at: datetime
```

---

## Implementation Priority

### Week 1: Core Intake System
**Days 1-2: Backend Enhancements**
- [ ] Implement preview endpoints (no DB writes)
- [ ] Build auto-mapping logic with confidence scoring
- [ ] Add vault summary endpoint
- [ ] Create commit endpoint

**Days 3-4: Frontend Wizard**
- [ ] Enhance upload component with preview
- [ ] Build mapping review interface
- [ ] Add data preview with confidence indicators
- [ ] Implement commit & run workflow

### Week 2: Integration & Polish
**Days 5-6: Valuation Integration**
- [ ] Enhance valuation engine with pure functions
- [ ] Integrate KPI rail into deal detail page
- [ ] Add NOI trend chart
- [ ] Implement default assumptions

**Days 7: Testing & Polish**
- [ ] Add comprehensive tests for mapping logic
- [ ] Test full workflow end-to-end
- [ ] Add error handling and loading states
- [ ] Performance optimization

---

## Data Derivation Strategy

### Core Concept: Uploaded Data → Derived Assumptions → Valuation

The system intelligently derives valuation assumptions from the uploaded financial data, creating a seamless data-driven workflow:

#### Rent Roll → Deal Properties
```python
# From Rent Roll Data
rentroll_data = get_rentroll_data(deal_id)

# Derive deal properties
deal_properties = {
    "unit_count": len(rentroll_data),
    "total_square_feet": sum(unit.square_feet or 0 for unit in rentroll_data),
    "average_unit_sf": total_square_feet / unit_count,
    "average_rent": sum(unit.rent for unit in rentroll_data) / unit_count,
    "total_potential_rent": sum(unit.market_rent or unit.rent for unit in rentroll_data)
}

# Update Deal record
update_deal_properties(deal_id, deal_properties)
```

#### T-12 Data → Financial Assumptions
```python
# From T-12 Data
t12_data = get_t12_data(deal_id)

# Calculate annual metrics
monthly_noi = [month.net_operating_income for month in t12_data]
monthly_egi = [month.total_income for month in t12_data]

annual_noi = sum(monthly_noi) / len(monthly_noi) * 12
annual_egi = sum(monthly_egi) / len(monthly_egi) * 12

# Derive financial assumptions
financial_assumptions = {
    "annual_noi": annual_noi,
    "annual_egi": annual_egi,
    "purchase_price": annual_noi / 0.055,  # Cap rate method
    "loan_amount": (annual_noi / 0.055) * 0.8,  # 80% LTV
    "expense_ratio": (annual_egi - annual_noi) / annual_egi,
    "cap_rate": 0.055  # Market assumption
}
```

#### Combined Data → Valuation Inputs
```python
def create_valuation_inputs(deal_id: int):
    """Create comprehensive valuation inputs from derived data"""
    
    # Get derived assumptions
    deal_props = derive_deal_properties(deal_id)
    financial_assumptions = derive_financial_assumptions(deal_id)
    
    # Combine into valuation inputs
    valuation_inputs = {
        **deal_props,
        **financial_assumptions,
        
        # Market assumptions (user can override)
        "interest_rate": 0.05,
        "exit_cap_rate": 0.055,
        "hold_period": 5,
        "vacancy_rate": 0.05,
    }
    
    return valuation_inputs
```

### Benefits of Data-Driven Approach

1. **Automated Deal Population**: Unit count, square footage, and other properties auto-populate
2. **Realistic Assumptions**: Purchase price and loan amount derived from actual NOI
3. **Accurate Calculations**: Expense ratios and other metrics calculated from real data
4. **Reduced User Input**: Less manual data entry, fewer errors
5. **Intelligent Defaults**: Assumptions based on actual property performance

### User Override Capability

While the system derives assumptions from data, users can still override any parameter:

```typescript
interface ValuationAssumptions {
  // Data-derived (read-only in UI)
  unit_count: number
  annual_noi: number
  annual_egi: number
  
  // User-overridable
  purchase_price: number
  loan_amount: number
  interest_rate: number
  exit_cap_rate: number
  hold_period: number
  vacancy_rate: number
}
```

---

## Technical Specifications

### Database Schema Updates
```sql
-- New table for mapping persistence
CREATE TABLE mapping_configs (
    id INTEGER PRIMARY KEY,
    deal_id INTEGER REFERENCES deals(id),
    data_type TEXT NOT NULL, -- 't12' or 'rentroll'
    column_mapping JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_t12_normalized_deal_id ON t12_normalized(deal_id);
CREATE INDEX idx_rentroll_normalized_deal_id ON rent_roll_normalized(deal_id);
CREATE INDEX idx_valuation_runs_deal_id ON valuation_runs(deal_id);
```

### API Response Schemas
```typescript
interface IntakePreviewResponse {
  success: boolean
  previewRows: any[]
  mapping: ColumnMapping
  confidence: number
  suggestions: string[]
  dataQuality: DataQualityReport
}

interface ColumnMapping {
  [canonicalColumn: string]: {
    sourceColumn: string
    confidence: number
    transformation?: string
  }
}

interface VaultSummary {
  monthly: Array<{
    period: string // "2024-01"
    egi: number    // Effective Gross Income
    opex: number   // Operating Expenses  
    noi: number    // Net Operating Income
  }>
  totals: {
    annualEGI: number
    annualOpEx: number
    annualNOI: number
  }
}
```

### Frontend Component Architecture
```typescript
// New components
components/
├── IntakeWizard/
│   ├── UploadStep.tsx
│   ├── MappingStep.tsx
│   ├── PreviewStep.tsx
│   └── CommitStep.tsx
├── DataPreview/
│   ├── PreviewTable.tsx
│   ├── MappingEditor.tsx
│   └── ConfidenceIndicator.tsx
└── DealDetail/
    ├── KPIRail.tsx
    ├── NOIChart.tsx
    └── VaultSummary.tsx
```

---

## Success Metrics

### Functional Requirements ✅
- [ ] Upload T-12 + Rent Roll with drag & drop
- [ ] Auto-map columns with confidence scoring
- [ ] Preview 10 rows with mapping editor
- [ ] Commit to vault with single action
- [ ] **Derive assumptions from uploaded data** (unit count, NOI, EGI, etc.)
- [ ] **Update deal properties with derived data** (unit_count, nsf, etc.)
- [ ] Run valuation with data-derived assumptions
- [ ] Display KPIs on deal detail page
- [ ] Show NOI trend chart
- [ ] Persist mapping for re-uploads
- [ ] Log audit events for compliance

### Performance Requirements ✅
- [ ] Upload processing < 3 seconds for 1000 rows
- [ ] Auto-mapping confidence > 80% for standard formats
- [ ] Valuation run completion < 5 seconds
- [ ] Page load times < 2 seconds

### Quality Requirements ✅
- [ ] 90%+ test coverage for mapping logic
- [ ] Error handling for all failure scenarios
- [ ] Loading states for all async operations
- [ ] Type safety with TypeScript
- [ ] Responsive design for mobile/tablet

---

## Risk Mitigation

### Technical Risks
1. **Auto-mapping Accuracy**: Start with simple patterns, expand iteratively
2. **Performance**: Use pagination for large datasets, optimize DB queries
3. **Data Validation**: Strict schema validation, comprehensive error messages

### Scope Risks
1. **Feature Creep**: Stick to MVP scope, defer AI mapping to next phase
2. **Integration Complexity**: Build incrementally, test each integration point
3. **UI/UX Polish**: Focus on functionality first, polish second

---

## Next Phase Preparation

This MVP creates the foundation for:
- **AI-Powered Mapping**: Machine learning for column detection
- **Scenario Analysis**: Multiple assumption sets and sensitivity analysis  
- **Advanced Analytics**: Market analysis, comparable properties
- **Export Enhancements**: PDF reports, presentation decks
- **Collaboration**: Multi-user workflows, comments, approvals

---

## Approval Request

This optimized build specification leverages the existing codebase foundation while adding the critical preview/mapping workflow and valuation integration. The phased approach ensures deliverable milestones while maintaining code quality.

**Key Optimizations:**
- Reuses existing data models and API structure
- Builds on current component library
- Maintains TypeScript type safety
- Focuses on MVP scope with clear success criteria

**Estimated Timeline:** 7 days for full implementation
**Team Size:** 1-2 developers (full-stack)
**Risk Level:** Low (building on proven foundation)

**Do you approve this build specification?**
