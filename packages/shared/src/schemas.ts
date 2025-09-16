/** Zod schemas for DealBase */

import { z } from 'zod';

export const DealSchema = z.object({
  id: z.number(),
  name: z.string(),
  property_type: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  created_at: z.string(),
  updated_at: z.string(),
});

export const DealCreateSchema = z.object({
  name: z.string().min(1),
  property_type: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip_code: z.string().min(1),
  description: z.string().optional(),
});

export const T12DataSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  gross_rent: z.number().min(0),
  other_income: z.number().min(0),
  total_income: z.number().min(0),
  operating_expenses: z.number().min(0),
  net_operating_income: z.number(),
});

export const RentRollDataSchema = z.object({
  unit_number: z.string(),
  unit_type: z.string(),
  square_feet: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  rent: z.number().min(0),
  market_rent: z.number().min(0).optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  tenant_name: z.string().optional(),
});

export const KPIsSchema = z.object({
  irr: z.number(),
  equity_multiple: z.number(),
  dscr: z.number(),
  egi: z.number(),
  noi: z.number(),
  cap_rate: z.number(),
  ltv: z.number(),
});

export const ValuationRunSchema = z.object({
  id: z.number(),
  deal_id: z.number(),
  name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  assumptions: z.record(z.any()),
  results: KPIsSchema,
  created_at: z.string(),
  completed_at: z.string().optional(),
});

export const ValuationRequestSchema = z.object({
  name: z.string().min(1),
  assumptions: z.object({
    purchase_price: z.number().min(0),
    loan_amount: z.number().min(0),
    exit_cap_rate: z.number().min(0).max(1),
    hold_period: z.number().min(1),
    interest_rate: z.number().min(0).max(1).optional(),
    vacancy_rate: z.number().min(0).max(1).optional(),
    expense_ratio: z.number().min(0).max(1).optional(),
  }),
});

export const IntakeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  preview_data: z.array(z.record(z.any())),
  mapping_report: z.object({
    total_rows: z.number().optional(),
    total_units: z.number().optional(),
    date_range: z.string().optional(),
    columns_mapped: z.array(z.string()),
    data_quality: z.object({
      missing_values: z.record(z.number()),
      negative_noi_months: z.number().optional(),
      zero_rent_units: z.number().optional(),
    }),
  }),
});

export const AuditEventSchema = z.object({
  id: z.number(),
  deal_id: z.number(),
  event_type: z.string(),
  description: z.string(),
  metadata: z.record(z.any()),
  created_at: z.string(),
});

export const ResultBundleSchema = z.object({
  deal: DealSchema,
  valuation_runs: z.array(ValuationRunSchema),
  t12_data: z.array(T12DataSchema),
  rent_roll_data: z.array(RentRollDataSchema),
  audit_events: z.array(AuditEventSchema),
});
