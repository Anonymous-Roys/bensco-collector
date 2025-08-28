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
