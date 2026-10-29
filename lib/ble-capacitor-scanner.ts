/**
 * BLE scanner using Capacitor Bluetooth LE plugin for native background support
 */
import { BleClient } from '@capacitor-community/bluetooth-le';
import { resolveAdvertisement, BeaconMode } from './ble-protocol';
import * as api from './api';
import { getSession } from './session';

type AlertCallback = (event: {
  mode: BeaconMode;
  beaconId: string;
  eventId: string | null;
}) => void;

export class CapacitorBLEScanner {
  private scanning = false;
  private alertCallback?: AlertCallback;
  private lastEmergencyEvent?: string;
  private scanInterval: any = null;

  constructor(callback?: AlertCallback) {
    this.alertCallback = callback;
  }

  async initialize(): Promise<boolean> {
    try {
      await BleClient.initialize();
      return true;
    } catch (err) {
      console.error('BLE init failed:', err);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      await BleClient.initialize();
      return true;
    } catch (err) {
      console.error('Permission request failed:', err);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await BleClient.isEnabled();
    } catch {
      return false;
    }
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    
    try {
      await this.initialize();
      const enabled = await this.isAvailable();
      if (!enabled) {
        try {
          await BleClient.enable();
        } catch {}
      }
      
      this.scanning = true;
      
      // Continuous scanning with restart
      const startScan = async () => {
        try {
          await BleClient.stopLEScan();
        } catch {}
        try {
          await BleClient.requestLEScan(
            {
              allowDuplicates: true,
            },
            (result) => {
              this.handleScanResult(result);
            }
          );
        } catch (err) {
          console.error('Scan error:', err);
          setTimeout(startScan, 2000);
        }
      };
      
      startScan();
      // Restart scan every 10 seconds to keep it active
      this.scanInterval = setInterval(startScan, 10000);
    } catch (err) {
      console.error('Start scan failed:', err);
      this.scanning = false;
    }
  }

  async stopScanning(): Promise<void> {
    if (!this.scanning) return;
    try {
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      await BleClient.stopLEScan();
      this.scanning = false;
    } catch (err) {
      console.error('Stop scan failed:', err);
    }
  }

  private handleScanResult(result: any): void {
    try {
      const session = getSession();
      if (!session) return;

      const name = result.device?.name || result.localName || result.advertisement?.localName || '';
      
      // Look for EchoSOS-e- pattern specifically
      if (name.startsWith('EchoSOS-e-') || name.includes('EchoSOS-e')) {
        const adv = resolveAdvertisement(name);
        if (adv && adv.mode === 'e' && adv.eventId) {
          if (this.lastEmergencyEvent !== adv.eventId) {
            this.lastEmergencyEvent = adv.eventId;
            this.handleEmergency(adv);
          }
        }
        this.alertCallback?.({ mode: 'e', beaconId: adv?.beaconId || name.split('-')[2] || '', eventId: adv?.eventId || null });
        return;
      }
      
      const adv = resolveAdvertisement(name);
      if (adv) {
        if (adv.mode === 'e' && adv.eventId) {
          if (this.lastEmergencyEvent !== adv.eventId) {
            this.lastEmergencyEvent = adv.eventId;
            this.handleEmergency(adv);
          }
        } else if (adv.mode === 'c' && adv.eventId) {
          this.handleCancel(adv);
        }
        this.alertCallback?.({ mode: adv.mode, beaconId: adv.beaconId, eventId: adv.eventId });
      }
    } catch (err) {
      console.error('Handle scan result error:', err);
    }
  }

  private async handleEmergency(adv: any): Promise<void> {
    try {
      const session = getSession();
      if (!session) return;

      let coords = { latitude: 0, longitude: 0 };
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
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

export const bleCapacitorScanner = new CapacitorBLEScanner();
