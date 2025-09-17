/** Shared TypeScript types for DealBase */

export interface Deal {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  // Multifamily-specific fields
  msa?: string; // Metropolitan Statistical Area
  year_built?: number;
  unit_count?: number; // Number of units
  nsf?: number; // Net Square Feet
  deal_tags?: string[]; // Array of deal tags
}

export interface DealCreate {
  name: string;
  slug?: string; // Optional, will be generated if not provided
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description?: string;
  // Multifamily-specific fields
  msa?: string;
  year_built?: number;
  unit_count?: number;
  nsf?: number;
  deal_tags?: string[];
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
  // Additional metrics
  cash_on_cash: number;
  unlevered_irr: number;
  levered_irr: number;
  payback_period: number;
  break_even_occupancy: number;
  debt_yield: number;
  debt_service: number;
  total_return: number;
  // Market metrics
  price_per_sqft: number;
  rent_per_sqft: number;
  occupancy_rate: number;
  // Risk metrics
  dscr_minimum: number;
  ltv_maximum: number;
  debt_coverage_ratio: number;
  // Additional risk factors
  interest_rate: number;
  vacancy_rate: number;
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

export interface ScenarioAnalysis {
  id: number;
  deal_id: number;
  name: string;
  scenarios: Scenario[];
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  assumptions: ValuationRequest['assumptions'];
  results: KPIs;
  sensitivity_factors: SensitivityFactor[];
}

export interface SensitivityFactor {
  variable: string;
  base_value: number;
  sensitivity_range: {
    min: number;
    max: number;
    step: number;
  };
  impact_on_irr: number[];
  impact_on_dscr: number[];
}

export interface MarketAnalysis {
  deal_id: number;
  comparable_properties: ComparableProperty[];
  market_trends: MarketTrend[];
  rent_roll_analysis: RentRollAnalysis;
  created_at: string;
}

export interface ComparableProperty {
  id: string;
  name: string;
  address: string;
  property_type: string;
  price_per_sqft: number;
  cap_rate: number;
  noi: number;
  distance_miles: number;
  sale_date: string;
}

export interface MarketTrend {
  metric: string;
  current_value: number;
  historical_average: number;
  trend_direction: 'up' | 'down' | 'stable';
  confidence_level: number;
}

export interface RentRollAnalysis {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  average_rent: number;
  market_rent: number;
  rent_premium: number;
  lease_expirations: LeaseExpiration[];
  rent_growth_potential: number;
}

export interface LeaseExpiration {
  month: number;
  year: number;
  units_expiring: number;
  current_rent: number;
  market_rent: number;
  renewal_probability: number;
}

export interface ResultBundle {
  deal: Deal;
  valuation_runs: ValuationRun[];
  t12_data: T12Data[];
  rent_roll_data: RentRollData[];
  audit_events: AuditEvent[];
  scenario_analysis?: ScenarioAnalysis;
  market_analysis?: MarketAnalysis;
}
