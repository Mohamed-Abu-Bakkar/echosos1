export type BeaconStatus = 'CONNECTED' | 'READY_TO_PAIR' | 'DISCONNECTED';

export type AlertEventType = 
  | 'SOS_ALERT'
  | 'CONTACT_DELIVERED'
  | 'BEACON_CONNECTED'
  | 'SYSTEM_UPDATE'
  | 'LOW_BATTERY';

export type StatusBadge = 
  | 'Alert Sent'
  | 'Delivered'
  | 'Connected'
  | 'Updated'
  | 'Warning'
  | 'Disconnected';

export type NotificationType = 'SOS' | 'SYSTEM' | 'UPDATES';

export interface User {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Beacon {
  id: number;
  user_id: number;
  mac_address: string;
  device_name: string;
  signal_dbm: number;
  status: BeaconStatus;
  battery_percent: number;
}

export interface EmergencyContact {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  photo_url?: string;
  initials?: string;
}

export interface AlertHistory {
  id: number;
  user_id: number;
  beacon_id?: number;
  event_type: AlertEventType;
  status_badge: StatusBadge;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
