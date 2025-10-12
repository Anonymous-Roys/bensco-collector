// Types
export interface Client {
  id: string;
  name: string;
  phone_number: string;
  address?: string | null;
  amount_daily: string;
  is_fixed: boolean;
  start_date: string;
  unique_code: string;
  collector: string;
  collector_username: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ClientListResponse extends ApiResponse<Client> {}

// Contribution types
export interface Contribution {
  id: string;
  client: string;
  collector: string;
  savings_cycle: string;
  amount: string;
  days_covered?: number;
  created_at: string;
}

export interface ContributionCreateRequest {
  client: string;
  collector: string;
  amount: string;
  days_covered?: number;
}

// Flexible list shape
export type ContributionListResponse = Contribution[] | ApiResponse<Contribution>;

// Payout types
export interface PayoutRequest {
  id: string;
  client: string;
  client_name?: string;
  payout_type: 'client_specific' | 'bulk';
  requested_amount: number;
  available_balance: number;
  total_paid: number;
  commission: number;
  net_payout: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'auto_rejected';
  requested_by: string;
  requested_on: string;
  approved_by?: string;
  approved_on?: string;
  paid_on?: string;
  rejection_reason?: string;
}

export interface ClientBalance {
  client_id: string;
  client_name: string;
  available_balance: number;
  is_fixed: boolean;
  daily_amount: number;
  current_cycle: {
    total_collected: number;
    contributing_days: number;
    commission: number;
    cycle_length: number;
    start_date: string;
  } | null;
}

// Legacy types for backward compatibility (if needed)
export interface LegacyClient {
  id: string;
  name: string;
  phone: string;
  address?: string;
  savingsGoal: number;
  dailyAmount: number;
  cycleDays: number;
  currentBalance: number;
  daysCompleted: number;
  lastContribution: Date;
  status: 'active' | 'inactive' | 'complete' | 'pending';
  assignedWorker: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string;
  time: string;
  paymentMethod: 'cash' | 'momo' | 'bank';
  notes?: string;
  status: 'completed' | 'pending';
}
