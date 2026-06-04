
export type UserRole = 'user' | 'admin';
export type TaskStatus = 'open' | 'assigned' | 'completed' | 'cancelled';
export type TaskUrgency = 'normal' | 'urgent' | 'emergency';
export type DisputeStatus = 'pending' | 'resolved' | 'dismissed';

export interface NotificationPreferences {
  jobAlerts: boolean;
  renewals: boolean;
  reviews: boolean;
  security: boolean;
  promotions: boolean;
}

export interface Broadcast {
  id: string;
  admin_id: string;
  title: string;
  message: string;
  target_role: 'all' | 'worker' | 'client' | 'user';
  created_at: string;
  expires_at?: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  tokens: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  address?: string; 
  state?: string;   
  lga?: string;     
  latitude?: number;
  longitude?: number;
  bio?: string;
  hourly_rate?: number;
  avatar_url?: string;
  nin_image_url?: string;
  instagram_handle?: string;
  portfolio_url?: string;
  is_verified: boolean;
  category?: string;
  subcategory?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  notification_preferences?: NotificationPreferences;
  is_blocked?: boolean;
  block_reason?: string;
  
  task_count: number;
  job_count: number;
  rating_count: number;
  avg_rating: number;
  avg_communication: number;
  avg_quality: number;
  avg_punctuality: number;
  profile_score: number;
  views_count?: number;
}

export interface PostedTask {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  latitude?: number;
  longitude?: number;
  status: TaskStatus;
  urgency: TaskUrgency;
  due_date?: string;
  assigned_worker_id?: string;
  category: string;
  subcategory?: string;
  created_at: string;
  image_url?: string;
}

export interface Booking {
  id: string;
  client_id: string;
  worker_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'declined';
  task_id?: string;
  created_at: string;
  quote_price?: number;
  rating?: number; 
  review?: string;
  is_punctual?: boolean;
  client_rating?: number; 
  client_review?: string;
  profiles?: Profile; 
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  reporter_id: string;
  booking_id: string;
  reason_type: string;
  details: string;
  status: DisputeStatus;
  created_at: string;
}