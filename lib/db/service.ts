import { 
  User, 
  Beacon, 
  EmergencyContact, 
  AlertHistory, 
  NotificationItem, 
  BeaconStatus,
  StatusBadge,
  AlertEventType,
  NotificationType
} from '@/lib/types';
import { 
  currentUser as mockUser, 
  activeBeacon as mockBeacon, 
  initialEmergencyContacts, 
  initialAlertHistory, 
  initialNotifications,
  nearbyDevices
} from '@/lib/mock-data';

interface StoredUser extends User {
  password_hash: string;
}

interface UserPreferences {
  userId: number;
  darkMode: boolean;
  language: string;
  notificationsEnabled: boolean;
  sosSensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
}

// In-memory persistent state for fast reliable execution
class DatabaseService {
  private users: StoredUser[] = [
    {
      ...mockUser,
      // Default password: "password123"
      password_hash: 'c808794833ae81c5d98522ce2d7cf793d98fb837a3c77d24a737f2dd0616b9cb',
    },
  ];

  private preferences: UserPreferences[] = [
    {
      userId: 1,
      darkMode: false,
      language: 'en-US',
      notificationsEnabled: true,
      sosSensitivity: 'HIGH',
    },
  ];

  private beacons: Beacon[] = [{ ...mockBeacon }];
  private contacts: EmergencyContact[] = [...initialEmergencyContacts];
  private alertHistory: AlertHistory[] = [...initialAlertHistory];
  private notifications: NotificationItem[] = [...initialNotifications];
  private activeAlertState: {
    id: number;
    isActive: boolean;
    beaconId: string;
    detectedAt: string;
    signalDbm: string;
    latitude: number;
    longitude: number;
    contactsDispatched: number;
    dispatchUrl: string;
  } = {
    id: 1,
    isActive: true,
    beaconId: 'ESP32-S3',
    detectedAt: '10:24 AM',
    signalDbm: '-45 dBm (Good)',
    latitude: 10.8247,
    longitude: 78.6956,
    contactsDispatched: 3,
    dispatchUrl: '/track/1',
  };

  // --- USER AUTHENTICATION & PROFILE ---
  async findUserByPhone(phone: string): Promise<StoredUser | null> {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = this.users.find(
      (u) => u.phone.replace(/\s+/g, '') === cleanPhone
    );
    return user || null;
  }

  async findUserById(id: number): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async createUser(name: string, phone: string, passwordHash: string): Promise<User> {
    const newUser: StoredUser = {
      id: this.users.length + 1,
      name,
      phone,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
    this.users.push(newUser);

    // Initialize default beacon for new user
    this.beacons.push({
      id: this.beacons.length + 1,
      user_id: newUser.id,
      mac_address: `C7:3A:5B:${Math.floor(10 + Math.random() * 89)}:${Math.floor(10 + Math.random() * 89)}:9F`,
      device_name: 'ESP32-S3',
      signal_dbm: -45,
      status: 'CONNECTED',
      battery_percent: 92,
    });

    this.preferences.push({
      userId: newUser.id,
      darkMode: false,
      language: 'en-US',
      notificationsEnabled: true,
      sosSensitivity: 'HIGH',
    });

    const { password_hash, ...safeUser } = newUser;
    return safeUser;
  }

  async updateUserProfile(userId: number, data: { name?: string; phone?: string; passwordHash?: string }): Promise<User | null> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;

    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;
    if (data.passwordHash) user.password_hash = data.passwordHash;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  // --- USER PREFERENCES ---
  async getUserPreferences(userId: number): Promise<UserPreferences> {
    let pref = this.preferences.find((p) => p.userId === userId);
    if (!pref) {
      pref = {
        userId,
        darkMode: false,
        language: 'en-US',
        notificationsEnabled: true,
        sosSensitivity: 'HIGH',
      };
      this.preferences.push(pref);
    }
    return pref;
  }

  async updateUserPreferences(userId: number, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const pref = await this.getUserPreferences(userId);
    Object.assign(pref, data);
    return pref;
  }

  // --- PASSWORD RESET ---
  async requestPasswordReset(phone: string): Promise<{ success: boolean; tempCode: string }> {
    const user = await this.findUserByPhone(phone);
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.notifications.unshift({
      id: Date.now(),
      user_id: user ? user.id : 1,
      type: 'SYSTEM',
      title: 'Security: Password Reset Requested',
      message: `Your verification code is ${tempCode}. Valid for 10 minutes.`,
      is_read: false,
      created_at: 'Just now',
    });

    return { success: true, tempCode };
  }

  // --- BEACON MANAGEMENT & IOT HARDWARE INGESTION ---
  async getBeacon(userId: number): Promise<Beacon | null> {
    return this.beacons.find((b) => b.user_id === userId) || this.beacons[0];
  }

  async pairBeacon(userId: number, deviceName: string, mac: string): Promise<Beacon> {
    let beacon = this.beacons.find((b) => b.user_id === userId);
    if (beacon) {
      beacon.device_name = deviceName;
      beacon.mac_address = mac;
      beacon.status = 'CONNECTED';
      beacon.signal_dbm = -45;
    } else {
      beacon = {
        id: this.beacons.length + 1,
        user_id: userId,
        mac_address: mac,
        device_name: deviceName,
        signal_dbm: -45,
        status: 'CONNECTED',
        battery_percent: 88,
      };
      this.beacons.push(beacon);
    }

    // Log connection in history
    this.alertHistory.unshift({
      id: Date.now(),
      user_id: userId,
      beacon_id: beacon.id,
      event_type: 'BEACON_CONNECTED',
      status_badge: 'Connected',
      latitude: 10.8247,
      longitude: 78.6956,
      created_at: 'Just now',
    });

    // Add notification
    this.notifications.unshift({
      id: Date.now(),
      user_id: userId,
      type: 'SYSTEM',
      title: `${deviceName} Connected`,
      message: `Device with MAC ${mac} paired successfully via BLE.`,
      is_read: false,
      created_at: 'Just now',
    });

    return beacon;
  }

  // IoT Ingestion endpoint for ESP32-S3 Hardware
  async ingestHardwareTelemetry(data: {
    macAddress: string;
    batteryPercent?: number;
    signalDbm?: number;
    buttonPressed?: boolean;
    latitude?: number;
    longitude?: number;
  }): Promise<{ acknowledged: boolean; alertTriggered: boolean }> {
    const beacon = this.beacons.find((b) => b.mac_address === data.macAddress) || this.beacons[0];

    if (data.batteryPercent !== undefined) beacon.battery_percent = data.batteryPercent;
    if (data.signalDbm !== undefined) beacon.signal_dbm = data.signalDbm;
    beacon.status = 'CONNECTED';

    let alertTriggered = false;
    if (data.buttonPressed) {
      await this.triggerAlert(beacon.user_id, data.latitude, data.longitude);
      alertTriggered = true;
    }

    return { acknowledged: true, alertTriggered };
  }

  // --- EMERGENCY CONTACTS ---
  async getContacts(userId: number): Promise<EmergencyContact[]> {
    return this.contacts.filter((c) => c.user_id === userId || c.user_id === 1);
  }

  async createContact(userId: number, data: {
    name: string;
    phone: string;
    relationship: string;
    is_primary?: boolean;
    photo_url?: string;
  }): Promise<EmergencyContact> {
    const initials = data.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    if (data.is_primary) {
      this.contacts.forEach((c) => {
        if (c.user_id === userId || c.user_id === 1) {
          c.is_primary = false;
        }
      });
    }

    const newContact: EmergencyContact = {
      id: Date.now(),
      user_id: userId,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship,
      is_primary: Boolean(data.is_primary),
      photo_url: data.photo_url || '',
      initials: initials || 'EC',
    };

    if (data.is_primary) {
      this.contacts.unshift(newContact);
    } else {
      this.contacts.push(newContact);
    }

    return newContact;
  }

  async updateContact(id: number, data: Partial<EmergencyContact>): Promise<EmergencyContact | null> {
    const contact = this.contacts.find((c) => c.id === id);
    if (!contact) return null;

    if (data.is_primary) {
      this.contacts.forEach((c) => (c.is_primary = false));
    }

    Object.assign(contact, data);
    return contact;
  }

  async deleteContact(id: number): Promise<boolean> {
    const index = this.contacts.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.contacts.splice(index, 1);
    return true;
  }

  // --- SOS ALERT MANAGEMENT ---
  async getActiveAlert(): Promise<typeof this.activeAlertState> {
    return this.activeAlertState;
  }

  async getAlertById(id: number): Promise<AlertHistory | null> {
    const alert = this.alertHistory.find((a) => a.id === id);
    return alert || this.alertHistory[0] || null;
  }

  async triggerAlert(userId: number, lat?: number, lng?: number): Promise<AlertHistory> {
    const latitude = lat || 10.8247;
    const longitude = lng || 78.6956;
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const alertId = Date.now();

    this.activeAlertState = {
      id: alertId,
      isActive: true,
      beaconId: 'ESP32-S3',
      detectedAt: timestamp,
      signalDbm: '-45 dBm (Good)',
      latitude,
      longitude,
      contactsDispatched: this.contacts.length,
      dispatchUrl: `/track/${alertId}`,
    };

    const newAlert: AlertHistory = {
      id: alertId,
      user_id: userId,
      beacon_id: 1,
      event_type: 'SOS_ALERT',
      status_badge: 'Alert Sent',
      latitude,
      longitude,
      created_at: `Today, ${timestamp}`,
    };

    this.alertHistory.unshift(newAlert);

    // Auto-create delivery notification with live tracking link
    this.notifications.unshift({
      id: Date.now() + 1,
      user_id: userId,
      type: 'SOS',
      title: 'Emergency Distress Broadcasted',
      message: `SOS coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) transmitted to ${this.contacts.length} emergency contacts and police dispatch. Live tracking link: /track/${alertId}`,
      is_read: false,
      created_at: `Today, ${timestamp}`,
    });

    return newAlert;
  }

  async cancelAlert(userId: number): Promise<boolean> {
    this.activeAlertState.isActive = false;

    const cancelEvent: AlertHistory = {
      id: Date.now(),
      user_id: userId,
      beacon_id: 1,
      event_type: 'SYSTEM_UPDATE',
      status_badge: 'Warning',
      latitude: this.activeAlertState.latitude,
      longitude: this.activeAlertState.longitude,
      created_at: 'Just now',
    };

    this.alertHistory.unshift(cancelEvent);

    this.notifications.unshift({
      id: Date.now() + 2,
      user_id: userId,
      type: 'SYSTEM',
      title: 'SOS Alert Cancelled by User',
      message: 'False alert notice dispatched to emergency contacts. Emergency routing standby resumed.',
      is_read: false,
      created_at: 'Just now',
    });

    return true;
  }

  // --- ALERT & AUDIT HISTORY ---
  async getAlertHistory(userId: number, filter?: string): Promise<AlertHistory[]> {
    if (!filter || filter === 'ALL') {
      return this.alertHistory;
    }
    if (filter === 'SOS') {
      return this.alertHistory.filter(
        (a) => a.event_type === 'SOS_ALERT' || a.event_type === 'CONTACT_DELIVERED'
      );
    }
    if (filter === 'SYSTEM') {
      return this.alertHistory.filter(
        (a) => a.event_type === 'BEACON_CONNECTED' || a.event_type === 'LOW_BATTERY'
      );
    }
    if (filter === 'UPDATES') {
      return this.alertHistory.filter((a) => a.event_type === 'SYSTEM_UPDATE');
    }
    return this.alertHistory;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(userId: number, type?: string): Promise<NotificationItem[]> {
    if (!type || type === 'ALL') {
      return this.notifications;
    }
    return this.notifications.filter((n) => n.type === type);
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    this.notifications.forEach((n) => {
      n.is_read = true;
    });
  }
}

// Global singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __dbService: DatabaseService | undefined;
}

export const dbService = global.__dbService || new DatabaseService();

if (process.env.NODE_ENV !== 'production') {
  global.__dbService = dbService;
}
