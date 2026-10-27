import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult, BleDevice } from '@capacitor-community/bluetooth-le';
import {
  BEACON_MODE,
  BeaconAdvertisement,
  BeaconMode,
  ECHOSOS_EVENT_STATE_CHAR_UUID,
  ECHOSOS_SERVICE_UUID,
  GattEventState,
  decodeGattEventState,
  modeFromName,
  resolveAdvertisement,
  verifyCancelTarget,
} from './ble-protocol';

export interface DiscoveredDevice {
  id: string; // device ID (MAC on Android, UUID on iOS/web)
  name: string | null;
  rssi: number;
  advertising: {
    serviceUuids?: string[];
    manufacturerData?: Array<{ vendorId: number; data: string }>;
    txPowerLevel?: number;
  };
  /** Parsed from manufacturer data (preferred) or name fallback. */
  advertisement?: BeaconAdvertisement;
  mode?: BeaconMode;
  beaconId?: string;
  eventId?: string | null;
  /** True when identity came from manufacturer payload, not just the name. */
  hasVerifiedAdvertisement?: boolean;
}

export interface CancelVerificationResult {
  verified: boolean;
  reachable: boolean;
  state: GattEventState | null;
  reason?: string;
  message: string;
}

/**
 * BLE scanner + GATT reader for EchoSOS beacons.
 *
 * Advertisement identity is taken from manufacturer data when present;
 * the local name is only a truncated-name fallback, never sole auth.
 *
 * During cancellation the app connects and reads the Event State
 * characteristic so the backend cancel can be bound to a real event ID.
 */
export class BackgroundBLEScanner {
  private foundDevices: Map<string, DiscoveredDevice> = new Map();
  private isScanning = false;
  private scanCallback: ((result: ScanResult) => void) | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private onDeviceCallback: ((device: DiscoveredDevice) => void) | null = null;

  private getPlatform(): string {
    return (Capacitor as { getPlatform: () => string }).getPlatform();
  }

  async isAvailable(): Promise<boolean> {
    const platform = this.getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      return true;
    }

    try {
      const result = await BleClient.isEnabled();
      return result === true;
    } catch (error) {
      console.error('BLE availability check error:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<void> {
    const platform = this.getPlatform();
    if (platform === 'ios' || platform === 'android') {
      try {
        await BleClient.initialize();
      } catch (error) {
        console.error('BLE initialization error:', error);
      }
    }
  }

  /**
   * Start scanning for EchoSOS beacons.
   * Filters by EchoSOS service UUID when the stack supports it, then
   * resolves identity from manufacturer data / name via the protocol.
   */
  async startScanning(onDeviceCallback: (device: DiscoveredDevice) => void): Promise<void> {
    this.onDeviceCallback = onDeviceCallback;
    this.isScanning = true;

    await this.requestPermissions();

    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      console.error('Bluetooth LE not available');
      this.isScanning = false;
      return;
    }

    this.scanCallback = async (result: ScanResult) => {
      try {
        const bleDevice: BleDevice = result.device;
        const deviceName = bleDevice.name as string | null;

        const manufacturerData = result.manufacturerData
          ? Object.entries(result.manufacturerData).map(([vendorId, data]) => ({
              vendorId: parseInt(vendorId, 10),
              data: data as string | Uint8Array | ArrayBuffer | DataView,
            }))
          : undefined;

        const advertisement = resolveAdvertisement(deviceName, manufacturerData);
        const nameMode = modeFromName(deviceName);

        // Accept when manufacturer payload matches, or name still hints EchoSOS
        // (fallback path for beacons that have not shipped manufacturer data yet).
        if (!advertisement && !nameMode) {
          return;
        }

        const discoveredDevice: DiscoveredDevice = {
          id: bleDevice.deviceId,
          name: deviceName || null,
          rssi: result.rssi || 0,
          advertising: {
            serviceUuids: bleDevice.uuids,
            manufacturerData: manufacturerData?.map((entry) => ({
              vendorId: entry.vendorId,
              data: dataViewToHex(entry.data),
            })),
            txPowerLevel: result.txPower,
          },
          advertisement: advertisement ?? undefined,
          mode: advertisement?.mode ?? nameMode ?? undefined,
          beaconId: advertisement?.beaconId,
          eventId: advertisement?.eventId ?? null,
          hasVerifiedAdvertisement: advertisement?.fromManufacturerData ?? false,
        };

        this.foundDevices.set(bleDevice.deviceId, discoveredDevice);
        this.onDeviceCallback?.(discoveredDevice);
      } catch (error) {
        console.error('Error processing scan result:', error);
      }
    };

    try {
      await BleClient.requestLEScan(
        {
          services: [ECHOSOS_SERVICE_UUID],
          allowDuplicates: false,
        },
        this.scanCallback
      );
    } catch {
      // Some stacks reject empty/unknown service filters on web — retry broad scan.
      await BleClient.requestLEScan(
        {
          services: [],
          allowDuplicates: false,
        },
        this.scanCallback
      );
    }

    this.startScanInterval();
  }

  private startScanInterval(): void {
    this.scanInterval = setInterval(() => {
      if (!this.isScanning) {
        clearInterval(this.scanInterval!);
        this.scanInterval = null;
        if (this.scanCallback) {
          this.scanCallback = null;
          void BleClient.stopLEScan().catch(() => {
            // Ignore errors during cleanup
          });
        }
        return;
      }
    }, 2000);
  }

  async stopScanning(): Promise<void> {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.scanCallback = null;
    try {
      await BleClient.stopLEScan();
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }

  getFoundDevices(): DiscoveredDevice[] {
    return Array.from(this.foundDevices.values());
  }

  getOwnBeacon(): DiscoveredDevice | null {
    const devices = this.getFoundDevices();
    const registrationDevices = devices.filter(
      (d) => d.mode === BEACON_MODE.registration || d.name?.startsWith('EchoSOS-r-')
    );
    return registrationDevices.length > 0 ? registrationDevices[0] : null;
  }

  getEmergencyBeacon(): DiscoveredDevice | null {
    const devices = this.getFoundDevices();
    const emergencyDevices = devices.filter(
      (d) => d.mode === BEACON_MODE.emergency || d.name?.startsWith('EchoSOS-e-')
    );
    return emergencyDevices.length > 0 ? emergencyDevices[0] : null;
  }

  /**
   * Connect to a beacon and read the Event State characteristic.
   * Used during cancellation to verify the active event ID on-device.
   */
  async readGattEventState(deviceId: string): Promise<GattEventState | null> {
    const platform = this.getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      return null;
    }

    try {
      await BleClient.initialize();
      await BleClient.connect(deviceId);
      const value = await BleClient.read(
        deviceId,
        ECHOSOS_SERVICE_UUID,
        ECHOSOS_EVENT_STATE_CHAR_UUID
      );
      return decodeGattEventState(value as DataView);
    } catch (error) {
      console.warn('GATT Event State read failed:', error);
      return null;
    } finally {
      try {
        await BleClient.disconnect(deviceId);
      } catch {
        // already disconnected
      }
    }
  }

  /**
   * Best-effort cancel verification over GATT.
   * `reachable: false` means we could not connect (web/unavailable) —
   * callers should still allow backend cancel with the known event ID.
   */
  async verifyEventForCancel(
    deviceId: string,
    expectedEventId: string,
    expectedBeaconId?: string | null
  ): Promise<CancelVerificationResult> {
    const state = await this.readGattEventState(deviceId);

    if (!state) {
      return {
        verified: false,
        reachable: false,
        state: null,
        reason: 'unreachable',
        message:
          'Beacon GATT unavailable — cancelling with the event ID already known to the server.',
      };
    }

    const check = verifyCancelTarget(state, expectedEventId, expectedBeaconId);
    if (check.ok) {
      return {
        verified: true,
        reachable: true,
        state,
        message: 'Beacon confirmed the active event ID.',
      };
    }

    return {
      verified: false,
      reachable: true,
      state,
      reason: check.reason,
      message:
        check.reason === 'event-id-mismatch'
          ? 'Beacon reports a different event ID than this alert. Not cancelling.'
          : `Beacon state rejected cancel (${check.reason}).`,
    };
  }

  /** Push an event ID to the beacon's Event State characteristic (app-triggered SOS). */
  async writeEventState(
    deviceId: string,
    mode: BeaconMode,
    beaconId: string,
    eventId: string | null
  ): Promise<boolean> {
    const platform = this.getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      return false;
    }

    try {
      await BleClient.initialize();
      await BleClient.connect(deviceId);
      const payload = new Uint8Array(10);
      payload[0] = mode.charCodeAt(0);
      const beaconBytes = hexToBytes(beaconId);
      const eventBytes = hexToBytes(eventId || '00000000');
      payload.set(beaconBytes, 1);
      payload.set(eventBytes, 5);
      payload[9] = 0xff;
      const view = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
      );
      await BleClient.write(
        deviceId,
        ECHOSOS_SERVICE_UUID,
        ECHOSOS_EVENT_STATE_CHAR_UUID,
        view
      );
      return true;
    } catch (error) {
      console.warn('GATT Event State write failed:', error);
      return false;
    } finally {
      try {
        await BleClient.disconnect(deviceId);
      } catch {
        // already disconnected
      }
    }
  }
}

function dataViewToHex(data: string | Uint8Array | ArrayBuffer | DataView): string {
  if (typeof data === 'string') return data;
  let bytes: Uint8Array;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (data instanceof DataView) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    bytes = data;
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(id: string): Uint8Array {
  const out = new Uint8Array(4);
  const numeric = parseInt(id, 16);
  if (!Number.isFinite(numeric)) return out;
  out[0] = (numeric >>> 24) & 0xff;
  out[1] = (numeric >>> 16) & 0xff;
  out[2] = (numeric >>> 8) & 0xff;
  out[3] = numeric & 0xff;
  return out;
}
