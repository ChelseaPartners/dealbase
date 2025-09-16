/** Shared TypeScript types for DealBase */

export interface Deal {
  id: number;
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DealCreate {
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description?: string;
}

export interface T12Data {
  month: number;
  year: number;
  gross_rent: number;
  other_income: number;
  total_income: number;
  operating_expenses: number;
  net_operating_income: number;
}

export interface RentRollData {
  unit_number: string;
  unit_type: string;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  rent: number;
  market_rent?: number;
  lease_start?: string;
  lease_end?: string;
  tenant_name?: string;
}

export interface KPIs {
  irr: number;
  equity_multiple: number;
  dscr: number;
  egi: number; // Effective Gross Income
  noi: number; // Net Operating Income
  cap_rate: number;
  ltv: number; // Loan-to-Value
}

export interface ValuationRun {
  id: number;
  deal_id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assumptions: Record<string, any>;
  results: KPIs;
  created_at: string;
  completed_at?: string;
}

export interface ValuationRequest {
  name: string;
  assumptions: {
    purchase_price: number;
    loan_amount: number;
    exit_cap_rate: number;
    hold_period: number;
    interest_rate?: number;
    vacancy_rate?: number;
    expense_ratio?: number;
  };
}

export interface IntakeResponse {
  success: boolean;
  message: string;
  preview_data: Record<string, any>[];
  mapping_report: {
    total_rows?: number;
    total_units?: number;
    date_range?: string;
    columns_mapped: string[];
    data_quality: {
      missing_values: Record<string, number>;
      negative_noi_months?: number;
      zero_rent_units?: number;
    };
  };
}

export interface AuditEvent {
  id: number;
  deal_id: number;
  event_type: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ResultBundle {
  deal: Deal;
  valuation_runs: ValuationRun[];
  t12_data: T12Data[];
  rent_roll_data: RentRollData[];
  audit_events: AuditEvent[];
}
