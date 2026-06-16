
export type UserRole = 'user' | 'admin';
export type SubscriptionTier = 'basic' | 'lite' | 'standard' | 'pro' | 'enterprise';
export type TaskStatus = 'open' | 'assigned' | 'completed';
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
  target_role: 'all' | 'user' | 'admin';
  created_at: string;
  expires_at?: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  address?: string; 
  state?: string;   
  lga?: string;     
  latitude?: number;
  longitude?: number;
  bio?: string;
  service_title?: string;
  starting_price?: number;
  avatar_url?: string;
  nin_image_url?: string;
  id_rejection_reason?: string;
  instagram_handle?: string;
  portfolio_url?: string;
  is_verified: boolean;
  category?: string;
  subcategory?: string;
  last_reset_date: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  updated_at?: string;
  notification_preferences?: NotificationPreferences;
  is_blocked?: boolean;
  block_reason?: string;
  worker_rating_count?: number;
  worker_avg_rating?: number;
  worker_avg_communication?: number;
  worker_avg_quality?: number;
  worker_avg_punctuality?: number;
  client_rating_count?: number;
  client_avg_rating?: number;
  client_avg_communication?: number;
  client_avg_fairness?: number;
  profile_score?: number;
  tokens?: number;
  subscription_tier?: SubscriptionTier;
  subscription_end_date?: string;
  views_count?: number;
  referrer_id?: string;
}

export interface PromoCode {
  code: string;
  user_id: string;
  discount_percent: number;
  is_used: boolean;
  created_at?: string;
  used_at?: string;
}

export interface PostedTask {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  address?: string;
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
  worker_communication_rating?: number;
  worker_quality_rating?: number;
  worker_punctuality_rating?: number;
  is_punctual?: boolean;
  client_rating?: number; 
  client_review?: string;
  client_communication_rating?: number;
  client_fairness_rating?: number;
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
