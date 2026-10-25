import { 
  User, 
  Beacon, 
  EmergencyContact, 
  AlertHistory, 
  NotificationItem 
} from './types';

export const currentUser: User = {
  id: 1,
  name: 'Nithish',
  phone: '+91 98765 43210',
  created_at: '2024-01-15T08:00:00Z',
};

export const activeBeacon: Beacon = {
  id: 1,
  user_id: 1,
  mac_address: 'C7:3A:5B:12:4E:9F',
  device_name: 'ESP32-S3',
  signal_dbm: -45,
  status: 'CONNECTED',
  battery_percent: 88,
};

export const initialEmergencyContacts: EmergencyContact[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Mother',
    phone: '+91 98765 11111',
    relationship: 'Mother',
    is_primary: true,
    initials: 'MS',
    photo_url: '',
  },
  {
    id: 2,
    user_id: 1,
    name: 'Father',
    phone: '+91 98765 22222',
    relationship: 'Father',
    is_primary: false,
    initials: 'FS',
    photo_url: '',
  },
  {
    id: 3,
    user_id: 1,
    name: 'Police Station',
    phone: '112 / 100',
    relationship: 'Emergency Services',
    is_primary: false,
    initials: 'AP',
    photo_url: '',
  },
];

export const initialAlertHistory: AlertHistory[] = [
  {
    id: 1,
    user_id: 1,
    beacon_id: 1,
    event_type: 'SOS_ALERT',
    status_badge: 'Alert Sent',
    latitude: 10.8247,
    longitude: 78.6956,
    created_at: '28 Apr 2025, 10:24 AM',
  },
  {
    id: 2,
    user_id: 1,
    beacon_id: 1,
    event_type: 'CONTACT_DELIVERED',
    status_badge: 'Delivered',
    latitude: 10.8247,
    longitude: 78.6956,
    created_at: '28 Apr 2025, 10:24 AM',
  },
  {
    id: 3,
    user_id: 1,
    beacon_id: 1,
    event_type: 'BEACON_CONNECTED',
    status_badge: 'Connected',
    latitude: 10.8247,
    longitude: 78.6956,
    created_at: '28 Apr 2025, 09:15 AM',
  },
  {
    id: 4,
    user_id: 1,
    beacon_id: 1,
    event_type: 'SYSTEM_UPDATE',
    status_badge: 'Updated',
    created_at: '27 Apr 2025, 06:30 PM',
  },
  {
    id: 5,
    user_id: 1,
    beacon_id: 1,
    event_type: 'LOW_BATTERY',
    status_badge: 'Warning',
    latitude: 10.8210,
    longitude: 78.6910,
    created_at: '26 Apr 2025, 02:10 PM',
  },
  {
    id: 6,
    user_id: 1,
    beacon_id: 1,
    event_type: 'CONTACT_DELIVERED',
    status_badge: 'Delivered',
    latitude: 10.8247,
    longitude: 78.6956,
    created_at: '25 Apr 2025, 11:05 AM',
  },
  {
    id: 7,
    user_id: 1,
    beacon_id: 1,
    event_type: 'BEACON_CONNECTED',
    status_badge: 'Connected',
    latitude: 10.8247,
    longitude: 78.6956,
    created_at: '24 Apr 2025, 08:00 AM',
  },
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    user_id: 1,
    type: 'SOS',
    title: 'SOS Emergency Alert Triggered',
    message: 'Beacon triggered alert. Telemetry and live coordinates dispatched to 3 trusted contacts.',
    is_read: false,
    created_at: '28 Apr 2025, 10:24 AM',
  },
  {
    id: 2,
    user_id: 1,
    type: 'SOS',
    title: 'Alert Delivered to Mother (MS)',
    message: 'SMS and Push Notification successfully confirmed with GPS tracking link.',
    is_read: false,
    created_at: '28 Apr 2025, 10:24 AM',
  },
  {
    id: 3,
    user_id: 1,
    type: 'SYSTEM',
    title: 'ESP32-S3 Beacon Connected',
    message: 'Device connected via Bluetooth Low Energy with strong signal (-45 dBm).',
    is_read: true,
    created_at: '28 Apr 2025, 09:15 AM',
  },
  {
    id: 4,
    user_id: 1,
    type: 'UPDATES',
    title: 'EchoSOS System Update v1.2',
    message: 'New high-speed emergency routing algorithm and battery life improvements enabled.',
    is_read: true,
    created_at: '27 Apr 2025, 06:30 PM',
  },
  {
    id: 5,
    user_id: 1,
    type: 'SYSTEM',
    title: 'Beacon Battery Status Warning',
    message: 'Beacon battery reached 20%. Please connect magnetic charger.',
    is_read: true,
    created_at: '26 Apr 2025, 02:10 PM',
  },
];

export const nearbyDevices = [
  {
    name: 'EchoSOS-001',
    mac: 'C7:3A:5B:12:4E:9F',
    signal: '-45 dBm',
    available: true,
  },
  {
    name: 'EchoSOS-002',
    mac: 'B2:4C:19:98:3A:D1',
    signal: '-67 dBm',
    available: false,
  },
  {
    name: 'ESP32-Device',
    mac: 'FA:81:04:77:E5:22',
    signal: '-78 dBm',
    available: false,
  },
];
