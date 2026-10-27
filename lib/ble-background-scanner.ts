import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult, BleDevice } from '@capacitor-community/bluetooth-le';

export interface DiscoveredDevice {
  id: string;           // device ID (MAC address on Android, UUID on iOS/web)
  name: string | null;  // device name
  rssi: number;         // signal strength
  advertising: {
    serviceUuids?: string[];
    manufacturerData?: Array<{ vendorId: number; data: string }>;
    txPowerLevel?: number;
  };
}

/**
 * BLE Background Scanner for EchoSOS patterns
 * - Scans for EchoSOS-r-... (registration mode)
 * - Scans for EchoSOS-e-... (emergency alert mode)
 * - Uses BleClient.requestLEScan/stopLEScan for scanning
 */
export class BackgroundBLEScanner {
  private foundDevices: Map<string, DiscoveredDevice> = new Map();
  private isScanning = false;
  private scanCallback: ((result: ScanResult) => void) | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private onDeviceCallback: ((device: DiscoveredDevice) => void) | null = null;

  /**
   * Check if BLE is available and enabled
   */
  async isAvailable(): Promise<boolean> {
    const platform = (Capacitor as any).getPlatform();
    if (platform !== 'ios' && platform !== 'android') {
      // Web mode - check for basic BT availability
      return true;
    }

    try {
      const result: any = await BleClient.isEnabled();
      return result === true;
    } catch (error) {
      console.error('BLE availability check error:', error);
      return false;
    }
  }

  /**
   * Request BLE permissions and initialize
   */
  async requestPermissions(): Promise<void> {
    const platform = (Capacitor as any).getPlatform();
    if (platform === 'ios' || platform === 'android') {
      try {
        // On iOS, we need to initialize first which will request permissions
        // On Android, location permission is needed for scanning
        await BleClient.initialize();
      } catch (error) {
        console.error('BLE initialization error:', error);
      }
    }
  }

  /**
   * Start scanning for EchoSOS beacons
   * @param onDeviceCallback - called when a matching device is found
   */
  async startScanning(onDeviceCallback: (device: DiscoveredDevice) => void): Promise<void> {
    this.onDeviceCallback = onDeviceCallback;
    this.isScanning = true;

    // Request permissions
    await this.requestPermissions();

    // Check availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      console.error('Bluetooth LE not available');
      this.isScanning = false;
      return;
    }

    // Start scanning using requestLEScan with a callback
    this.scanCallback = async (result: ScanResult) => {
      try {
        const bleDevice: BleDevice = result.device;
        const deviceName = bleDevice.name as string | null;

        // Check for EchoSOS patterns
        const isRegistration = this.isEchoSOSRegistration(deviceName);
        const isEmergency = this.isEchoSOSEmergency(deviceName);

        if (isRegistration || isEmergency) {
          const discoveredDevice: DiscoveredDevice = {
            id: bleDevice.deviceId,
            name: deviceName || null,
            rssi: result.rssi || 0,
            advertising: {
              serviceUuids: bleDevice.uuids,
              manufacturerData: result.manufacturerData
                ? Object.entries(result.manufacturerData).map(([vendorId, data]) => ({
                    vendorId: parseInt(vendorId, 10),
                    data: String(data),
                  }))
                : undefined,
              txPowerLevel: result.txPower,
            },
          };

          this.foundDevices.set(bleDevice.deviceId, discoveredDevice);

          // Call the callback if provided
          this.onDeviceCallback?.(discoveredDevice);
        }
      } catch (error) {
        console.error('Error processing scan result:', error);
      }
    };

    await BleClient.requestLEScan(
      {
        services: [],
        allowDuplicates: false,
      },
      this.scanCallback
    );

    // Set up periodic scan interval to continue discovering
    this.startScanInterval();
  }

  private startScanInterval(): void {
    // Scan every 2 seconds to continuously discover devices
    const self = this;
    this.scanInterval = setInterval(async () => {
      if (!self.isScanning) {
        clearInterval(self.scanInterval!);
        self.scanInterval = null;
        if (self.scanCallback) {
          self.scanCallback = null;
          try {
            await BleClient.stopLEScan();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        return;
      }
      // The scan callback will continue to fire with new results
    }, 2000);
  }

  /**
   * Check if device name matches EchoSOS registration pattern: EchoSOS-r-...
   */
  private isEchoSOSRegistration(name: string | null): boolean {
    if (!name) return false;
    return name.startsWith('EchoSOS-r-');
  }

  /**
   * Check if device name matches EchoSOS emergency pattern: EchoSOS-e-...
   */
  private isEchoSOSEmergency(name: string | null): boolean {
    if (!name) return false;
    return name.startsWith('EchoSOS-e-');
  }

  /**
   * Stop scanning
   */
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

  /**
   * Get all discovered EchoSOS devices
   */
  getFoundDevices(): DiscoveredDevice[] {
    return Array.from(this.foundDevices.values());
  }

  /**
   * Get the first registered EchoSOS device (own beacon)
   */
  getOwnBeacon(): DiscoveredDevice | null {
    const devices = this.getFoundDevices();
    const registrationDevices = devices.filter(d => d.name?.startsWith('EchoSOS-r-'));
    return registrationDevices.length > 0 ? registrationDevices[0] : null;
  }

  /**
   * Get the first emergency EchoSOS device detected
   */
  getEmergencyBeacon(): DiscoveredDevice | null {
    const devices = this.getFoundDevices();
    const emergencyDevices = devices.filter(d => d.name?.startsWith('EchoSOS-e-'));
    return emergencyDevices.length > 0 ? emergencyDevices[0] : null;
  }
}