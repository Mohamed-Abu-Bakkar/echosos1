export type { Doc, Id } from "../convex/_generated/dataModel";

export interface User {
  id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  photo_url?: string;
  initials?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = 'SOS' | 'SYSTEM' | 'UPDATES';

export interface AlertHistory {
  id: string;
  user_id: string;
  beacon_id?: string;
  event_type: string;
  status_badge: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export type StatusBadge =
  | 'Alert Sent'
  | 'Delivered'
  | 'Connected'
  | 'Updated'
  | 'Warning'
  | 'Disconnected';
