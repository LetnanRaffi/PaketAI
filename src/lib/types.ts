export interface Employee {
  id: string;
  full_name: string;
  employee_id?: string | null;
  department: string;
  phone_number: string;
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
