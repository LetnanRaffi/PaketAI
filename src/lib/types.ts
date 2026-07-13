export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string | null;
  role: 'admin' | 'member';
  full_name: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  org_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  amount: number;
  current_period_start: string | null;
  current_period_end: string | null;
  temanqris_order_id: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  employee_id?: string | null;
  department: string;
  phone_number: string;
  org_id: string;
  created_at: string;
}

export interface Package {
  id: string;
  receipt_image_url: string;
  recipient_name_raw: string;
  employee_id: string | null; // FK -> employees.id
  match_confidence: number;
  tracking_number: string;
  courier: string;
  status: 'belum_diambil' | 'sudah_diambil';
  received_at: string;
  picked_up_at?: string | null;
  picked_up_verification?: 'qr' | 'pin' | 'signature' | null;
  admin_id: string;
  org_id: string;
  created_at: string;
  // Joined field from API
  employee?: Employee | null;
}

export interface ScanResult {
  recipient_name_raw: string;
  tracking_number: string;
  courier: string;
  matched_employee_name: string | null;
  matched_employee_id: string | null;
  match_confidence: number;
  receipt_image_url: string;
}
