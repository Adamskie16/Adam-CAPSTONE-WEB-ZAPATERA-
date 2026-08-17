// Resident/src/types/index.ts

export type UserRole = 'resident' | 'admin' | 'superadmin';

export interface ResidentUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  age?: number;
  civil_status?: 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Separated' | string;
  sitio?: string;
  voter_status?: 'Registered Voter' | 'Non-Registered Voter' | string;
  role: UserRole;
  phone?: string;
  address?: string;
  id_type?: string;
  id_number?: string;
  is_active?: boolean;
  failed_attempts?: number;
  is_locked?: boolean;
  created_at?: string;
}

export interface DocumentType {
  id: string;
  code: string;
  title: string;
  description: string;
  fee: number;
  processing_days: number;
  requirements: string[];
  is_active: boolean;
  created_at?: string;
}

export type RequestStatus = 'pending' | 'under_review' | 'approved' | 'declined' | 'issued';

export interface DocumentRequest {
  id: string;
  tracking_number: string;
  resident_id: string;
  resident_name: string;
  resident_email: string;
  document_type_id: string;
  document_title: string;
  fee: number;
  purpose: string;
  requirements_attached: string[];
  pickup_time_slot: string;
  status: RequestStatus;
  notes?: string;
  rejection_reason?: string;
  processed_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface BarangayEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  target_audience: 'all' | 'residents' | 'officials' | string;
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | string;
  created_by?: string;
  created_at?: string;
}

export interface BarangayConfig {
  barangay_name: string;
  municipality: string;
  province: string;
  seal_url?: string;
  office_hours?: string;
  contact_email?: string;
  contact_phone?: string;
  doc_prefix?: string;
  auto_notify?: boolean;
  updated_at?: string;
}

export interface LogItem {
  id: string;
  user_email: string;
  action: string;
  feature: string;
  details?: string;
  level?: 'info' | 'warning' | 'danger' | string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  role_target?: string | null;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}
