/**
 * Foreground BLE scanner using the Capacitor Bluetooth LE plugin.
 */
import { BleClient } from '@capacitor-community/bluetooth-le';
import { resolveAdvertisement, buildBeaconLocalName, BeaconMode } from './ble-protocol';
import * as api from './api';
import { getSession } from './session';
import { bleEventBus } from './ble-events';

type AlertCallback = (event: {
  mode: BeaconMode;
  beaconId: string;
  eventId: string | null;
}) => void;

export class CapacitorBLEScanner {
  private scanning = false;
  private alertCallback?: AlertCallback;
  private lastEmergencyKey?: string;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private handlingEmergency = false;

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
      const initialized = await this.initialize();
      if (!initialized) return;
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
          if (!this.retryTimer) this.retryTimer = setTimeout(() => { this.retryTimer = null; startScan(); }, 2000);
        }
      };
      
      startScan();
      // Restart scan every 10 seconds to keep it active
      this.scanInterval = setInterval(startScan, 15000);
    } catch (err) {
      console.error('Start scan failed:', err);
      this.scanning = false;
    }
  }

  async stopScanning(): Promise<void> {
    if (!this.scanning) return;
    try {
      if (this.scanInterval) clearInterval(this.scanInterval);
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.scanInterval = null;
      this.retryTimer = null;
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

      const advertisedName =
        result.device?.name || result.localName || result.advertisement?.localName || '';

      const rawManufacturer = result.manufacturerData || result.advertisement?.manufacturerData || {};
      const manufacturerData = Object.entries(rawManufacturer).map(([vendorId, data]) => ({
        vendorId: Number(vendorId),
        data: data as DataView | ArrayBuffer | Uint8Array,
      })).filter((entry) => Number.isFinite(entry.vendorId));
      const adv = resolveAdvertisement(advertisedName, manufacturerData);
      const hasEchoSOSName = advertisedName.toLowerCase().startsWith('echosos-');

      // Display matching names even when the advertisement payload is not
      // parseable yet. Never trigger SOS/cancel actions without a valid payload.
      if (!adv && !hasEchoSOSName) return;

      const displayName = adv
        ? buildBeaconLocalName(adv.mode, adv.beaconId)
        : advertisedName;
      const mac = result.device?.deviceId || result.deviceId || '';
      if (mac) {
        bleEventBus.emit({
          name: displayName,
          mac,
          signal: typeof result.rssi === 'number' ? `${result.rssi} dBm` : 'N/A',
          available: true,
          rawName: displayName,
        });
      }

      if (!adv) return;

      this.alertCallback?.({ mode: adv.mode, beaconId: adv.beaconId, eventId: adv.eventId });
      if (adv.mode === 'e') {
        const eventKey = adv.eventId ? adv.beaconId + ':' + adv.eventId : adv.beaconId + ':emergency';
        if (this.lastEmergencyKey !== eventKey && !this.handlingEmergency) {
          this.lastEmergencyKey = eventKey;
          void this.handleEmergency(adv);
        }
      } else if (adv.mode === 'c') {
        void this.handleCancel(adv);
      }
    } catch (err) {
      console.error('Handle scan result error:', err);
    }
  }

  private async handleEmergency(adv: any): Promise<void> {
    if (this.handlingEmergency) return;
    this.handlingEmergency = true;
    try {
      const session = getSession();
      if (!session) return;

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {}
      }

      const result = await api.triggerAlert({
        latitude,
        longitude,
        beaconId: adv.beaconId,
        eventId: adv.eventId ?? undefined
      });
      if (!result.success) {
        this.lastEmergencyKey = undefined;
        console.error('SOS could not be recorded:', result.message);
      }
    } catch (err) {
      this.lastEmergencyKey = undefined;
      console.error('Failed to trigger emergency alert:', err);
    } finally {
      this.handlingEmergency = false;
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
      this.lastEmergencyKey = undefined;
    } catch (err) {
      console.error('Failed to cancel alert:', err);
    }
  }
}

export const bleCapacitorScanner = new CapacitorBLEScanner();
