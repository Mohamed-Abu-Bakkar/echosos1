/**
 * BLE background scanner for PWA using Web Bluetooth API
 * Continuously scans for EchoSOS beacons in emergency/cancel modes
 */
import { resolveAdvertisement, BeaconMode } from './ble-protocol';
import * as api from './api';
import { getSession } from './session';

type AlertCallback = (event: {
  mode: BeaconMode;
  beaconId: string;
  eventId: string | null;
}) => void;

export class BackgroundBLEScanner {
  private scanning = false;
  private watchId: number | null = null;
  private alertCallback?: AlertCallback;
  private lastEmergencyEvent?: string;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor(callback?: AlertCallback) {
    this.alertCallback = callback;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
        return false;
      }
      // Web Bluetooth requires user gesture, but we'll try
      return true;
    } catch {
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      return false;
    }
    try {
      const available = await (navigator as any).bluetooth.getAvailability?.();
      return available !== false;
    } catch {
      return true;
    }
  }

  startLocationTracking() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    // Start watching location in background
    this.watchId = navigator.geolocation.watchPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }

  stopLocationTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.startLocationTracking();
    
    // Start periodic scanning
    this.scanInterval = setInterval(async () => {
      await this.scanForBeacons();
    }, 5000); // Scan every 5 seconds
  }

  async stopScanning(): Promise<void> {
    this.scanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.stopLocationTracking();
  }

  private async scanForBeacons(): Promise<void> {
    try {
      const session = getSession();
      if (!session) return;

      if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
        // Web Bluetooth API - note: scanning in background is limited
        // Try to request device with filters
        try {
          const device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: []
          });
          
          const adv = resolveAdvertisement(device.name);
          if (adv) {
            if (adv.mode === 'e' && adv.eventId) {
              // Emergency signal detected
              if (this.lastEmergencyEvent !== adv.eventId) {
                this.lastEmergencyEvent = adv.eventId;
                await this.handleEmergency(adv);
              }
            } else if (adv.mode === 'c' && adv.eventId) {
              // Cancel signal detected
              await this.handleCancel(adv);
            }
            this.alertCallback?.({ mode: adv.mode, beaconId: adv.beaconId, eventId: adv.eventId });
          }
        } catch (err) {
          // User didn't interact or no devices - continue
        }
      }
    } catch (err) {
      console.error('BLE scan error:', err);
    }
  }

  private async handleEmergency(adv: any): Promise<void> {
    try {
      const session = getSession();
      if (!session) return;

      // Get current location
      let coords = { latitude: 0, longitude: 0 };
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {}
      }

      await api.triggerAlert({
        latitude: coords.latitude,
        longitude: coords.longitude,
        beaconId: adv.beaconId,
        eventId: adv.eventId
      });
    } catch (err) {
      console.error('Failed to trigger emergency alert:', err);
    }
  }

  private async handleCancel(adv: any): Promise<void> {
    try {
      const session = getSession();
      if (!session) return;

      await api.cancelAlert({
        eventId: adv.eventId,
        beaconId: adv.beaconId,
        bleVerified: false
      });
    } catch (err) {
      console.error('Failed to cancel alert:', err);
    }
  }
}

export const bleScanner = new BackgroundBLEScanner();
