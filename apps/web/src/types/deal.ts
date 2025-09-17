/** Deal types for the frontend */

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

export interface ValuationRun {
  id: number;
  deal_id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assumptions: Record<string, any>;
  results: any;
  created_at: string;
  completed_at?: string;
}
