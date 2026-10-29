/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Client API for the static Capacitor build.
 * Same response shapes as the former Next /api routes, backed by Convex.
 */

import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export interface ApiUser {
  id: string;
  name: string;
  phone: string;
  created_at?: string;
}

function requireUserId(): string | null {
  return getSession()?.userId ?? null;
}

// ---------- auth ----------

export async function getMe(): Promise<{
  authenticated: boolean;
  user: ApiUser | null;
}> {
  const session = getSession();
  if (!session) return { authenticated: false, user: null };
  try {
    const user = await convexQuery("users.js:getUserById", {
      userId: session.userId,
    });
    if (user) {
      return {
        authenticated: true,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          created_at: user.created_at,
        },
      };
    }
    return {
      authenticated: true,
      user: { id: session.userId, name: session.name, phone: session.phone },
    };
  } catch {
    return {
      authenticated: true,
      user: { id: session.userId, name: session.name, phone: session.phone },
    };
  }
}

export async function login(
  phone: string,
  password: string
): Promise<{ success: boolean; message: string; user?: ApiUser }> {
  if (!phone || !password) {
    return {
      success: false,
      message: "Please provide both mobile number and password",
    };
  }

  try {
    const result = await convexMutation("users.js:login", { phone, password });
    if (!result?.success || !result.user) {
      return {
        success: false,
        message: result?.message || "Invalid phone number or password.",
      };
    }
    const user = result.user;
    setSession(user._id, user.name, user.phone);
    return {
      success: true,
      message: result.message || "Login successful",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at,
      },
    };
  } catch {
    return {
      success: false,
      message: "Could not reach the server. Check your connection and try again.",
    };
  }
}

export async function register(
  name: string,
  phone: string,
  password: string
): Promise<{ success: boolean; message: string; user?: ApiUser }> {
  if (!name || !phone || !password) {
    return {
      success: false,
      message: "Name, phone number, and password are required",
    };
  }
  if (password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters" };
  }

  try {
    const existing = await convexQuery("users.js:getUserByPhone", { phone });
    if (existing) {
      return {
        success: false,
        message: "An account with this phone number already exists",
      };
    }

    const passwordHash = await hashPassword(password);
    const newUserId: string = await convexMutation("users.js:createUser", {
      name,
      phone,
      passwordHash,
    });
    const created = await convexQuery("users.js:getUserById", {
      userId: newUserId,
    });
    setSession(newUserId, created.name, created.phone);
    return {
      success: true,
      message: "Account registered successfully",
      user: {
        id: newUserId,
        name: created.name,
        phone: created.phone,
        created_at: created.created_at,
      },
    };
  } catch (err: any) {
    const msg = err?.message || "Registration failed";
    return { success: false, message: msg.includes("already exists") ? msg : "Registration failed" };
  }
}

export function logout(): void {
  clearSession();
}

// ---------- alerts ----------

export async function getAlert(): Promise<{ success: boolean; alertState: any }> {
  const userId = requireUserId();
  if (!userId) return { success: false, alertState: null };
  try {
    const alertState = await convexQuery("alerts.js:getActiveAlert", { userId });
    return { success: true, alertState };
  } catch {
    return { success: false, alertState: null };
  }
}

export async function getAlertByEventId(eventId: string): Promise<{
  success: boolean;
  alertState: any;
}> {
  try {
    const alertState = await convexQuery("alerts.js:getAlertByEventId", { eventId });
    return { success: true, alertState };
  } catch {
    return { success: false, alertState: null };
  }
}

export async function triggerAlert(body: {
  latitude?: number;
  longitude?: number;
  beaconId?: string;
  eventId?: string;
}): Promise<{
  success: boolean;
  message?: string;
  alert?: { id: string; eventId: string; beaconId: string };
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };

  try {
    const result = await convexMutation("alerts.js:triggerAlert", {
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
      beaconId: body.beaconId,
      eventId: body.eventId,
    });
    return {
      success: true,
      message: "SOS Distress Signal Dispatched!",
      alert: {
        id: result.historyId,
        eventId: result.eventId,
        beaconId: result.beaconId,
      },
    };
  } catch {
    return { success: false, message: "Failed to trigger alert" };
  }
}

export async function cancelAlert(body: {
  eventId?: string;
  beaconId?: string;
  bleVerified?: boolean;
}): Promise<{
  success: boolean;
  message?: string;
  reason?: string;
  status?: number;
}> {
  const userId = requireUserId();
  if (!userId) {
    return { success: false, message: "Unauthorized", status: 401 };
  }

  try {
    const result = await convexMutation("alerts.js:cancelAlert", {
      userId,
      eventId: body.eventId,
      beaconId: body.beaconId,
      bleVerified: Boolean(body.bleVerified),
    });

    if (result && result.cancelled === false && result.reason === "event-id-mismatch") {
      return {
        success: false,
        message: "Event ID does not match the active SOS. Alert left open.",
        reason: result.reason,
        status: 409,
      };
    }
    if (result && result.cancelled === false && result.reason === "no-active-alert") {
      return {
        success: true,
        message: "No active alert to cancel.",
        reason: result.reason,
      };
    }

    return {
      success: true,
      message: "SOS Alert cancelled. Contacts have been updated.",
      ...result,
    };
  } catch {
    return { success: false, message: "Failed to cancel alert", status: 500 };
  }
}

// ---------- contacts ----------

export async function getContacts(): Promise<{ success: boolean; contacts: any[] }> {
  const userId = requireUserId();
  if (!userId) return { success: false, contacts: [] };
  try {
    const contacts = await convexQuery("contacts.js:getContacts", { userId });
    return { success: true, contacts: mapDocs(contacts) };
  } catch (err) {
    console.error("getContacts failed:", err);
    return { success: false, contacts: [] };
  }
}

export async function createContact(body: {
  name: string;
  phone: string;
  relationship?: string;
  is_primary?: boolean;
  photo_url?: string;
}): Promise<{ success: boolean; message?: string; contact?: any }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  if (!body.name || !body.phone) {
    return { success: false, message: "Name and phone are required" };
  }

  try {
    const contactId = await convexMutation("contacts.js:createContact", {
      userId,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship || "Friend",
      isPrimary: Boolean(body.is_primary),
      photoUrl: body.photo_url,
    });
    return {
      success: true,
      message: "Contact added successfully",
      contact: { id: contactId, ...body },
    };
  } catch {
    return { success: false, message: "Invalid contact payload" };
  }
}

export async function updateContact(
  id: string,
  body: {
    name: string;
    phone: string;
    relationship?: string;
    is_primary?: boolean;
    photo_url?: string;
  }
): Promise<{ success: boolean; message?: string; contact?: any }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  if (!id || id === "undefined" || id === "null") {
    return { success: false, message: "Invalid contact id" };
  }

  try {
    const updated = await convexMutation("contacts.js:updateContact", {
      userId,
      contactId: id,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship,
      isPrimary: body.is_primary,
      photoUrl: body.photo_url,
    });
    if (!updated) return { success: false, message: "Contact not found" };
    return {
      success: true,
      message: "Contact updated successfully",
      contact: mapDoc(updated),
    };
  } catch (err) {
    console.error("updateContact failed:", err);
    return { success: false, message: "Failed to update contact" };
  }
}

export async function deleteContact(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  if (!id || id === "undefined" || id === "null") {
    return { success: false, message: "Invalid contact id" };
  }

  try {
    const deleted = await convexMutation("contacts.js:deleteContact", {
      userId,
      contactId: id,
    });
    if (!deleted) return { success: false, message: "Contact not found" };
    return { success: true, message: "Contact deleted successfully" };
  } catch (err) {
    console.error("deleteContact failed:", err);
    return { success: false, message: "Failed to delete contact" };
  }
}

// ---------- history ----------

export async function getHistory(filter?: string): Promise<{
  success: boolean;
  count: number;
  totalRecords: number;
  history: any[];
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, count: 0, totalRecords: 0, history: [] };
  try {
    const history = await convexQuery("alerts.js:getAlertHistory", {
      userId,
      filter,
    });
    const rows = mapDocs(history);
    return {
      success: true,
      count: rows.length,
      totalRecords: rows.length,
      history: rows,
    };
  } catch (err) {
    console.error("getHistory failed:", err);
    return { success: false, count: 0, totalRecords: 0, history: [] };
  }
}

// ---------- notifications ----------

export async function getNotifications(type?: string): Promise<{
  success: boolean;
  notifications: any[];
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, notifications: [] };
  try {
    const notifications = await convexQuery("notifications.js:getNotifications", {
      userId,
      type,
    });
    return { success: true, notifications: mapDocs(notifications) };
  } catch (err) {
    console.error("getNotifications failed:", err);
    return { success: false, notifications: [] };
  }
}

export async function markNotificationsRead(): Promise<{
  success: boolean;
  message?: string;
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    await convexMutation("notifications.js:markAllNotificationsRead", { userId });
    return { success: true, message: "All notifications marked as read" };
  } catch {
    return { success: false, message: "Failed to mark notifications read" };
  }
}

// ---------- beacon ----------

export async function getBeacon(): Promise<{
  success: boolean;
  beacon: any;
  nearbyDevices?: any[];
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, beacon: null, nearbyDevices: [] };
  try {
    const beacon = await convexQuery("beacons.js:getBeacon", { userId });
    return { success: true, beacon: mapDoc(beacon), nearbyDevices: [] };
  } catch (err) {
    console.error("getBeacon failed:", err);
    return { success: false, beacon: null, nearbyDevices: [] };
  }
}

export async function pairBeacon(body: {
  deviceName: string;
  macAddress: string;
  signalDbm?: number;
  batteryPercent?: number;
}): Promise<{ success: boolean; message?: string; beacon?: any }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  if (!body.deviceName || !body.macAddress) {
    return { success: false, message: "Device name and MAC address are required" };
  }

  try {
    const beacon = await convexMutation("beacons.js:pairBeacon", {
      userId,
      deviceName: body.deviceName,
      macAddress: body.macAddress,
      signalDbm: body.signalDbm,
      batteryPercent: body.batteryPercent,
    });
    return {
      success: true,
      message: `Beacon ${body.deviceName} paired and registered successfully!`,
      beacon: mapDoc(beacon),
    };
  } catch (err) {
    console.error("pairBeacon failed:", err);
    return { success: false, message: "Failed to pair beacon" };
  }
}

/**
 * Scan nearby EchoSOS beacons over real BLE (native only).
 * Returns an empty list on web — no simulated devices.
 */
export async function scanBeacon(): Promise<{
  success: boolean;
  scannedCount: number;
  devices: Array<{ name: string; mac: string; signal: string; available: boolean }>;
  message?: string;
  timestamp?: string;
}> {
  try {
    if (Capacitor.isNativePlatform()) {
      await BleClient.initialize();
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        await BleClient.enable();
      }
      await BleClient.requestLEScanPermissions();
      
      return new Promise((resolve) => {
        const devices = new Map<string, any>();
        BleClient.requestLEScan(
          { allowDuplicates: false },
          (result) => {
            const name = result.device.name || result.localName || '';
            const pattern = /echo|beacon|sos|esp/i;
            if (pattern.test(name) || name === '') {
              devices.set(result.device.deviceId, {
                name: name || 'EchoSOS Beacon',
                mac: result.device.deviceId,
                signal: result.rssi ? `${result.rssi} dBm` : 'N/A',
                available: true
              });
            }
          }
        ).then(() => {
          setTimeout(async () => {
            await BleClient.stopLEScan();
            const deviceList = Array.from(devices.values());
            resolve({
              success: true,
              scannedCount: deviceList.length,
              devices: deviceList,
              message: deviceList.length > 0 ? 'EchoSOS compatible device found' : 'No EchoSOS compatible beacons found',
              timestamp: new Date().toISOString(),
            });
          }, 5000);
        }).catch((err) => {
          resolve({
            success: false,
            scannedCount: 0,
            devices: [],
            message: err?.message || 'BLE scan failed',
            timestamp: new Date().toISOString(),
          });
        });
      });
    }
    
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: []
      });
      const name = device.name || '';
      const pattern = /echo|beacon|sos|esp/i;
      if (!pattern.test(name) && name) {
        return {
          success: true,
          scannedCount: 0,
          devices: [],
          message: 'No EchoSOS compatible beacons found with matching pattern',
          timestamp: new Date().toISOString(),
        };
      }
      return {
        success: true,
        scannedCount: 1,
        devices: [{
          name: name || 'EchoSOS Beacon',
          mac: device.id || 'N/A',
          signal: 'N/A',
          available: true
        }],
        message: 'EchoSOS compatible device found',
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    return {
      success: false,
      scannedCount: 0,
      devices: [],
      message: err?.message || 'Web Bluetooth scanning failed or not supported',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    success: false,
    scannedCount: 0,
    devices: [],
    message: 'Web Bluetooth not supported in this browser',
    timestamp: new Date().toISOString(),
  };
}

// ---------- preferences / profile ----------

export async function getPreferences(): Promise<{
  success: boolean;
  preferences: any;
}> {
  const userId = requireUserId();
  if (!userId) return { success: false, preferences: null };
  try {
    const preferences = await convexQuery("preferences.js:getPreferences", { userId });
    return { success: true, preferences };
  } catch (err) {
    console.error("getPreferences failed:", err);
    return { success: false, preferences: null };
  }
}

export async function updatePreferences(body: {
  darkMode?: boolean;
  language?: string;
  notificationsEnabled?: boolean;
  sosSensitivity?: string;
}): Promise<{ success: boolean; message?: string }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    await convexMutation("preferences.js:updatePreferences", {
      userId,
      darkMode: body.darkMode,
      language: body.language,
      notificationsEnabled: body.notificationsEnabled,
      sosSensitivity: body.sosSensitivity,
    });
    return { success: true, message: "Preferences updated" };
  } catch {
    return { success: false, message: "Failed to update preferences" };
  }
}

export async function getProfile(): Promise<{ success: boolean; user: any }> {
  const userId = requireUserId();
  if (!userId) return { success: false, user: null };
  try {
    const user = await convexQuery("users.js:getUserById", { userId });
    return { success: true, user: mapDoc(user) };
  } catch {
    return { success: false, user: null };
  }
}

export async function updateProfile(body: {
  name?: string;
  phone?: string;
  passwordHash?: string;
}): Promise<{ success: boolean; message?: string }> {
  const userId = requireUserId();
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    await convexMutation("users.js:updateUserProfile", {
      userId,
      name: body.name,
      phone: body.phone,
      passwordHash: body.passwordHash,
    });
    return { success: true, message: "Profile updated" };
  } catch {
    return { success: false, message: "Failed to update profile" };
  }
}

export type { StoredSession };

function mapDoc<T extends { _id: string }>(doc: T | null | undefined): any {
  if (!doc) return doc ?? null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function mapDocs<T extends { _id: string }>(docs: T[] | null | undefined): any[] {
  if (!docs) return [];
  return docs.map((d) => mapDoc(d)!);
}