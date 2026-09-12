export type DebtDirection = 'customer' | 'supplier';
export type DebtStatus = 'open' | 'paid';
export type UserRole = 'owner' | 'worker';
export type AdminActionType =
  | 'edit'
  | 'delete'
  | 'manual_add'
  | 'worker_add'
  | 'worker_deactivate'
  | 'worker_activate';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  pin_code?: string;
  avatar_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  direction: DebtDirection;
  party_name: string;
  party_phone?: string | null;
  amount: number;
  status: DebtStatus;
  description?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  created_by?: string | null;
  recorded_by_name?: string | null;
  confirmed_by?: string | null;
  confirmed_by_name?: string | null;
  last_edited_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation:
  creator_profile?: Profile | null;
  confirmer_profile?: Profile | null;
}

export interface EntryHistoryChange {
  old?: any;
  new?: any;
}

export interface EntryHistory {
  id: string;
  entry_id: string;
  changed_by?: string | null;
  changed_by_name: string;
  change_type: string; // 'created' | 'edited' | 'status_changed'
  field_name?: string | null;
  old_value?: any;
  new_value?: any;
  changes?: Record<string, EntryHistoryChange> | null;
  created_at: string;
}

export interface AdminActionLog {
  id: string;
  admin_user_id?: string | null;
  admin_name: string;
  action_type: AdminActionType;
  target_entry_id?: string | null;
  target_worker_id?: string | null;
  summary: string;
  before_data?: Partial<Entry> | null;
  after_data?: Partial<Entry> | null;
  deleted_entry_snapshot?: Entry | null;
  deleted_entry_history_snapshot?: EntryHistory[] | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface DashboardMetrics {
  totalOpenCustomerDebt: number;
  totalOpenSupplierDebt: number;
  overdueCustomerDebt: number;
  overdueSupplierDebt: number;
  openEntriesCount: number;
  paidEntriesCount: number;
  averageTimeToPaymentDays: number | null;
  debtTrend: {
    period: string;
    newDebtAmount: number;
    paidAmount: number;
    entriesCount: number;
  }[];
  workerActivities: {
    workerId: string;
    workerName: string;
    entriesCreated: number;
    totalAmountRecorded: number;
    openCount: number;
    paidCount: number;
    lastActiveAt?: string | null;
  }[];
}

export interface EntryFilters {
  search?: string;
  workerId?: string; // 'all' or worker uuid
  dateRange?: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  status?: 'all' | DebtStatus;
  direction?: 'all' | DebtDirection;
  minAmount?: number;
  maxAmount?: number;
}

export type CustomerSortOption = 'highest' | 'lowest' | 'recent';

export interface CustomerSummary {
  customer_name: string;
  customer_phone: string | null;
  total_debt: number;
  total_paid?: number;
  open_entries_count: number;
  paid_entries_count: number;
  latest_entry_date: string;
  earliest_due_date: string | null;
  is_overdue: boolean;
  days_overdue?: number;
  days_remaining?: number;
  entries: Entry[];
}
