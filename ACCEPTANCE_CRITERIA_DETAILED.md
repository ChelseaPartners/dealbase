# Detailed Acceptance Criteria & Testing Requirements

## User Story Acceptance Criteria

### Epic: Intake → Normalize → First-Run Loop (MVP)

#### Story 1: Upload & Preview Financial Data
**As a** real estate analyst  
**I want to** upload T-12 and Rent Roll files and see a preview with auto-mapped columns  
**So that** I can verify the data mapping before committing to the system

**Acceptance Criteria:**
- [ ] **AC1.1**: User can drag & drop CSV/XLSX files for T-12 and Rent Roll
- [ ] **AC1.2**: System shows file validation (size, format, required columns)
- [ ] **AC1.3**: Auto-mapping displays confidence scores (0-100%) for each column
- [ ] **AC1.4**: Preview shows first 10 rows with mapped data
- [ ] **AC1.5**: User can manually adjust column mappings before commit
- [ ] **AC1.6**: System suggests corrections for low-confidence mappings

**Test Cases:**
```typescript
describe('File Upload & Preview', () => {
  it('should accept CSV files up to 10MB', async () => {
    const file = new File(['test data'], 'test.csv', { type: 'text/csv' })
    const result = await uploadFile(file)
    expect(result.success).toBe(true)
  })
  
  it('should reject files over 10MB', async () => {
    const largeFile = createLargeFile(11 * 1024 * 1024) // 11MB
    const result = await uploadFile(largeFile)
    expect(result.success).toBe(false)
    expect(result.error).toContain('File too large')
  })
  
  it('should auto-map columns with >80% confidence', async () => {
    const csv = 'Month,Year,Gross Rent,Operating Expenses\n1,2024,100000,35000'
    const result = await previewIntake('t12', csv)
    expect(result.mapping.month.confidence).toBeGreaterThan(80)
    expect(result.mapping.gross_rent.confidence).toBeGreaterThan(80)
  })
  
  it('should show preview of 10 rows maximum', async () => {
    const csv = generateCSV(50) // 50 rows
    const result = await previewIntake('t12', csv)
    expect(result.previewRows).toHaveLength(10)
  })
})
```

#### Story 2: Commit Data to Vault
**As a** real estate analyst  
**I want to** commit the previewed data to the vault with a single action  
**So that** the normalized data is stored and ready for valuation

**Acceptance Criteria:**
- [ ] **AC2.1**: User can commit T-12 data after preview confirmation
- [ ] **AC2.2**: User can commit Rent Roll data after preview confirmation  
- [ ] **AC2.3**: User can commit both datasets simultaneously
- [ ] **AC2.4**: System validates data integrity before commit
- [ ] **AC2.5**: Commit replaces any existing data for the deal
- [ ] **AC2.6**: System logs audit event for commit action

**Test Cases:**
```typescript
describe('Data Commit to Vault', () => {
  it('should commit T-12 data successfully', async () => {
    const preview = await previewIntake('t12', sampleT12CSV)
    const commit = await commitIntake(dealId, { t12Mapping: preview.mapping })
    
    expect(commit.success).toBe(true)
    
    // Verify data in database
    const vaultData = await getVaultSummary(dealId)
    expect(vaultData.monthly).toHaveLength(12)
  })
  
  it('should replace existing data on re-commit', async () => {
    // First commit
    await commitIntake(dealId, { t12Mapping: mapping1 })
    
    // Second commit with different data
    await commitIntake(dealId, { t12Mapping: mapping2 })
    
    const vaultData = await getVaultSummary(dealId)
    expect(vaultData.monthly).toHaveLength(12)
    // Verify it's the new data, not the old
  })
  
  it('should log audit event on commit', async () => {
    await commitIntake(dealId, { t12Mapping: mapping })
    
    const auditEvents = await getAuditEvents(dealId)
    const commitEvent = auditEvents.find(e => e.event_type === 'intake_commit')
    expect(commitEvent).toBeDefined()
    expect(commitEvent.description).toContain('T-12 data committed')
  })
})
```

#### Story 3: Run First Valuation
**As a** real estate analyst  
**I want to** run a valuation with default assumptions after committing data  
**So that** I can see initial KPIs and validate the deal quality

**Acceptance Criteria:**
- [ ] **AC3.1**: User can trigger valuation run from commit workflow
- [ ] **AC3.2**: System derives assumptions from uploaded data (unit count, NOI, EGI, etc.)
- [ ] **AC3.3**: System updates deal properties with derived data (unit_count, nsf, etc.)
- [ ] **AC3.4**: Valuation completes within 5 seconds
- [ ] **AC3.5**: System calculates core KPIs: IRR, DSCR, Cap Rate, NOI
- [ ] **AC3.6**: Results are stored in ValuationRun record
- [ ] **AC3.7**: User is redirected to Deal Detail with results

**Test Cases:**
```typescript
describe('First Valuation Run', () => {
  it('should run valuation with data-derived assumptions', async () => {
    await commitIntake(dealId, { t12Mapping: mapping, rrMapping: rrMapping })
    
    const valuation = await runValuation(dealId, { name: 'Initial Run' })
    
    expect(valuation.status).toBe('completed')
    expect(valuation.results).toHaveProperty('irr')
    expect(valuation.results).toHaveProperty('dscr')
    expect(valuation.results).toHaveProperty('cap_rate')
    expect(valuation.results).toHaveProperty('noi')
    
    // Verify assumptions were derived from data
    expect(valuation.assumptions.unit_count).toBeGreaterThan(0)
    expect(valuation.assumptions.annual_noi).toBeGreaterThan(0)
    expect(valuation.assumptions.purchase_price).toBeGreaterThan(0)
  })
  
  it('should update deal properties with derived data', async () => {
    await commitIntake(dealId, { t12Mapping: mapping, rrMapping: rrMapping })
    
    const deal = await getDeal(dealId)
    
    expect(deal.unit_count).toBeGreaterThan(0)
    expect(deal.nsf).toBeGreaterThan(0)
  })
  
  it('should complete within 5 seconds', async () => {
    const startTime = Date.now()
    await runValuation(dealId, { name: 'Performance Test' })
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(5000)
  })
  
  it('should calculate realistic KPIs', async () => {
    const valuation = await runValuation(dealId, { name: 'KPI Test' })
    
    // IRR should be between -50% and 50%
    expect(valuation.results.irr).toBeGreaterThan(-0.5)
    expect(valuation.results.irr).toBeLessThan(0.5)
    
    // DSCR should be positive
    expect(valuation.results.dscr).toBeGreaterThan(0)
    
    // Cap rate should be between 2% and 15%
    expect(valuation.results.cap_rate).toBeGreaterThan(0.02)
    expect(valuation.results.cap_rate).toBeLessThan(0.15)
  })
})
```

#### Story 4: View Deal Results
**As a** real estate analyst  
**I want to** see the valuation results and NOI trend on the Deal Detail page  
**So that** I can assess the deal performance at a glance

**Acceptance Criteria:**
- [ ] **AC4.1**: Deal Detail shows KPI rail with latest valuation results
- [ ] **AC4.2**: NOI trend chart displays monthly data from vault
- [ ] **AC4.3**: Page loads within 2 seconds
- [ ] **AC4.4**: KPIs are formatted correctly (percentages, currency, decimals)
- [ ] **AC4.5**: Chart is responsive and interactive
- [ ] **AC4.6**: Shows "No data" state when no valuation exists

**Test Cases:**
```typescript
describe('Deal Detail Results Display', () => {
  it('should display KPI rail with latest results', async () => {
    await runValuation(dealId, { name: 'Test Run' })
    
    const dealPage = await visitDealDetail(dealId)
    
    expect(dealPage.kpiRail.irr).toBeDefined()
    expect(dealPage.kpiRail.dscr).toBeDefined()
    expect(dealPage.kpiRail.capRate).toBeDefined()
    expect(dealPage.kpiRail.noi).toBeDefined()
  })
  
  it('should format KPIs correctly', async () => {
    const dealPage = await visitDealDetail(dealId)
    
    // IRR should show as percentage
    expect(dealPage.kpiRail.irr).toMatch(/\d+\.\d+%/)
    
    // DSCR should show as decimal
    expect(dealPage.kpiRail.dscr).toMatch(/\d+\.\d+/)
    
    // NOI should show as currency
    expect(dealPage.kpiRail.noi).toMatch(/\$\d+,?\d*/)
  })
  
  it('should show NOI trend chart', async () => {
    await commitIntake(dealId, { t12Mapping: mapping })
    
    const dealPage = await visitDealDetail(dealId)
    
    expect(dealPage.noiChart).toBeVisible()
    expect(dealPage.noiChart.dataPoints).toHaveLength(12)
  })
  
  it('should load within 2 seconds', async () => {
    const startTime = Date.now()
    await visitDealDetail(dealId)
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(2000)
  })
})
```

#### Story 5: Re-upload with Mapping Memory
**As a** real estate analyst  
**I want to** re-upload updated files and have the system remember my previous mappings  
**So that** I don't have to re-map columns every time

**Acceptance Criteria:**
- [ ] **AC5.1**: System stores mapping configuration per deal
- [ ] **AC5.2**: Re-upload uses previous mapping as default
- [ ] **AC5.3**: User can still modify mappings if needed
- [ ] **AC5.4**: Mapping config persists across sessions
- [ ] **AC5.5**: Different file types (T-12 vs Rent Roll) have separate mappings

**Test Cases:**
```typescript
describe('Mapping Persistence', () => {
  it('should remember T-12 mapping for re-upload', async () => {
    // First upload with custom mapping
    const mapping1 = { month: 'Period', gross_rent: 'Income' }
    await commitIntake(dealId, { t12Mapping: mapping1 })
    
    // Re-upload with different file
    const preview = await previewIntake('t12', newT12CSV)
    
    expect(preview.mapping.month.sourceColumn).toBe('Period')
    expect(preview.mapping.gross_rent.sourceColumn).toBe('Income')
  })
  
  it('should allow mapping modification on re-upload', async () => {
    // Re-upload with modified mapping
    const newMapping = { month: 'Month', gross_rent: 'Gross Income' }
    const preview = await previewIntake('t12', newT12CSV)
    
    // User can still change mappings
    preview.mapping.month.sourceColumn = 'New Period Column'
    
    expect(preview.mapping.month.sourceColumn).toBe('New Period Column')
  })
  
  it('should separate T-12 and Rent Roll mappings', async () => {
    const t12Mapping = { month: 'Period', gross_rent: 'Income' }
    const rrMapping = { unit_number: 'Unit', rent: 'Rate' }
    
    await commitIntake(dealId, { t12Mapping, rrMapping })
    
    // Check that mappings are stored separately
    const configs = await getMappingConfigs(dealId)
    expect(configs).toHaveLength(2)
    expect(configs.find(c => c.data_type === 't12')).toBeDefined()
    expect(configs.find(c => c.data_type === 'rentroll')).toBeDefined()
  })
})
```

---

## Performance Requirements

### Response Time Requirements
- [ ] **PR1**: File upload processing < 3 seconds for files up to 1000 rows
- [ ] **PR2**: Auto-mapping confidence calculation < 1 second
- [ ] **PR3**: Data preview generation < 2 seconds
- [ ] **PR4**: Commit to vault < 5 seconds for 12 months of data
- [ ] **PR5**: Valuation run completion < 5 seconds
- [ ] **PR6**: Deal Detail page load < 2 seconds

### Load Requirements
- [ ] **PR7**: Support concurrent uploads from 5+ users
- [ ] **PR8**: Handle files up to 10MB without memory issues
- [ ] **PR9**: Database queries optimized with proper indexing

---

## Quality Requirements

### Code Quality
- [ ] **QR1**: 90%+ test coverage for mapping logic
- [ ] **QR2**: 80%+ test coverage for valuation engine
- [ ] **QR3**: All TypeScript types properly defined
- [ ] **QR4**: No linting errors or warnings
- [ ] **QR5**: API responses follow OpenAPI specification

### Error Handling
- [ ] **QR6**: Graceful handling of malformed CSV files
- [ ] **QR7**: Clear error messages for missing required columns
- [ ] **QR8**: Validation errors displayed inline in UI
- [ ] **QR9**: Network failures handled with retry logic
- [ ] **QR10**: Loading states for all async operations

### Security & Compliance
- [ ] **QR11**: File uploads sanitized and validated
- [ ] **QR12**: SQL injection protection in all queries
- [ ] **QR13**: Audit trail for all data modifications
- [ ] **QR14**: No sensitive data in client-side code
- [ ] **QR15**: CORS properly configured

---

## Integration Testing Requirements

### End-to-End Workflow Tests
```typescript
describe('Complete Intake → Valuation Workflow', () => {
  it('should complete full workflow successfully', async () => {
    // 1. Create deal
    const deal = await createDeal(sampleDealData)
    
    // 2. Upload T-12 data
    const t12Preview = await previewIntake('t12', sampleT12CSV)
    await commitIntake(deal.id, { t12Mapping: t12Preview.mapping })
    
    // 3. Upload Rent Roll data  
    const rrPreview = await previewIntake('rentroll', sampleRRCSV)
    await commitIntake(deal.id, { rrMapping: rrPreview.mapping })
    
    // 4. Run valuation
    const valuation = await runValuation(deal.id, { name: 'E2E Test' })
    
    // 5. Verify results on Deal Detail
    const dealPage = await visitDealDetail(deal.id)
    
    expect(dealPage.kpiRail.irr).toBeDefined()
    expect(dealPage.noiChart.dataPoints).toHaveLength(12)
    expect(dealPage.auditEvents).toHaveLength(3) // upload + commit + valuation
  })
})
```

### Cross-Browser Testing
- [ ] **CT1**: Chrome (latest 2 versions)
- [ ] **CT2**: Firefox (latest 2 versions)  
- [ ] **CT3**: Safari (latest 2 versions)
- [ ] **CT4**: Edge (latest 2 versions)

### Mobile Responsiveness
- [ ] **MR1**: Upload interface works on tablets (768px+)
- [ ] **MR2**: KPI rail responsive on mobile (320px+)
- [ ] **MR3**: Charts responsive and touch-friendly
- [ ] **MR4**: File drag & drop works on touch devices

---

## Definition of Done

### Development Complete When:
- [ ] All acceptance criteria met
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code reviewed and approved
- [ ] Performance requirements validated
- [ ] Security requirements verified
- [ ] Documentation updated

### Ready for Production When:
- [ ] Staging environment testing complete
- [ ] User acceptance testing passed
- [ ] Performance benchmarks met
- [ ] Error monitoring configured
- [ ] Rollback plan documented
- [ ] Team sign-off received

---

## Test Data Requirements

### Sample Files Needed
```csv
# sample_t12.csv
Month,Year,Gross Rent,Other Income,Operating Expenses
1,2024,100000,5000,35000
2,2024,102000,4800,36000
3,2024,101500,5200,35500
# ... 12 months total

# sample_rentroll.csv  
Unit Number,Unit Type,Square Feet,Bedrooms,Rent,Market Rent
101,1BR,750,1,1200,1250
102,1BR,750,1,1180,1250
201,2BR,950,2,1450,1500
# ... 50+ units
```

### Edge Cases to Test
- [ ] **EC1**: Empty files
- [ ] **EC2**: Files with only headers
- [ ] **EC3**: Files with extra columns
- [ ] **EC4**: Files with missing required columns
- [ ] **EC5**: Files with invalid data types
- [ ] **EC6**: Very large files (approaching 10MB limit)
- [ ] **EC7**: Files with special characters in column names
- [ ] **EC8**: Files with different date formats
