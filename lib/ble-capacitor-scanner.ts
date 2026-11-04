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
  private lastCancelKey?: string;
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
        result.localName || result.device?.name || result.advertisement?.localName || '';

      const rawManufacturer = result.manufacturerData || result.advertisement?.manufacturerData || {};
      const manufacturerData = Object.entries(rawManufacturer).map(([vendorId, data]) => ({
        vendorId: Number(vendorId),
        data: data as DataView | ArrayBuffer | Uint8Array,
      })).filter((entry) => Number.isFinite(entry.vendorId));
      const adv = resolveAdvertisement(advertisedName, manufacturerData);

      // Publish all named BLE scan results to the UI. The Beacon screen
      // applies the EchoSOS name filter. Protocol validation below still
      // gates all SOS/cancel behavior.
      const displayName = adv
        ? buildBeaconLocalName(adv.mode, adv.beaconId)
        : advertisedName;
      const mac = result.device?.deviceId || result.deviceId || '';
      if (mac && displayName) {
        bleEventBus.emit({
          name: displayName,
          mac,
          signal: typeof result.rssi === 'number' ? `${result.rssi} dBm` : 'N/A',
          available: Boolean(adv),
          rawName: displayName,
        });
      }

      if (!adv) return;

      this.alertCallback?.({ mode: adv.mode, beaconId: adv.beaconId, eventId: adv.eventId });
      if (adv.mode === 'e') {
        this.lastCancelKey = undefined;
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
        // BLE emergencies must allow enough time for a fresh GPS fix.
        // First request high accuracy, then fall back to a recent/coarse fix.
        const getPosition = (options: PositionOptions) =>
          new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
          });

        try {
          let pos: GeolocationPosition;
          try {
            pos = await getPosition({
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 30000,
            });
          } catch (highAccuracyError) {
            console.warn('High-accuracy GPS unavailable; trying fallback location:', highAccuracyError);
            pos = await getPosition({
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 5 * 60 * 1000,
            });
          }
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          console.info('BLE SOS location acquired:', {
            latitude,
            longitude,
            accuracyMeters: pos.coords.accuracy,
          });
        } catch (locationError) {
          console.warn('BLE SOS recorded without GPS coordinates:', locationError);
        }
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
      } else if (typeof window !== 'undefined') {
        // Notify the app shell only after the incident has been recorded.
        window.dispatchEvent(new CustomEvent('echosos:sos-triggered', {
          detail: { beaconId: adv.beaconId, eventId: result.alert?.eventId },
        }));
      }
    } catch (err) {
      this.lastEmergencyKey = undefined;
      console.error('Failed to trigger emergency alert:', err);
    } finally {
      this.handlingEmergency = false;
    }
  }

  private async handleCancel(adv: any): Promise<void> {
    const cancelKey = adv.beaconId.toLowerCase();
    if (this.lastCancelKey === cancelKey) return;
    try {
      const session = getSession();
      if (!session) return;

      // The current ESP32 advertises only its beacon ID in cancel mode.
      // Match that ID against the active incident before cancelling it.
      const active = await api.getAlert();
      const activeBeaconId = active.alertState?.beacon_id;
      if (
        active.success &&
        active.alertState?.is_active &&
        activeBeaconId &&
        String(activeBeaconId).toLowerCase() === adv.beaconId.toLowerCase()
      ) {
        // Ask once per cancellation advertisement episode, even if the beacon
        // repeats its BLE packet many times while the user decides.
        this.lastCancelKey = cancelKey;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('echosos:cancel-requested', {
            detail: { beaconId: adv.beaconId, eventId: active.alertState.event_id },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to cancel alert:', err);
    }
  }
}

export const bleCapacitorScanner = new CapacitorBLEScanner();
