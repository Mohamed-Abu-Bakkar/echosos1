import { Plugins } from '@capacitor/core';
import { BluetoothLe } from '@capacitor-community/bluetooth-le';

const { BluetoothLePlugin } = Plugins;

export interface DiscoveredDevice {
  id: string;
  name: string | null;
  advertising: {
    serviceUuids?: string[];
    manufacturerData?: Array<{ vendorId: number; data: string }>;
    txPowerLevel?: number;
  };
  rssi: number;
}

/**
 * Scan for BLE devices advertising EchoSOS patterns:
 * - EchoSOS-r-... for registration mode
 * - EchoSOS-e-... for emergency alert mode
 */
export class BLEScanner {
  private scannerId: string | null = null;
  private foundDevices: Map<string, DiscoveredDevice> = new Map();

  async startScan(): Promise<void> {
    // Check if BLE is available
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      throw new Error('Bluetooth Low Energy is not available on this device');
    }

    // Request permissions
    await this.requestPermissions();

    // Start scanning with active scanning to get advertising data
    await BluetoothLePlugin.startScan({
      services: [], // Empty to scan all services
      allowDuplicates: false,
    });

    // Listen for discovered devices
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for discovered peripheral advertisements
    BluetoothLePlugin.addListener('onDiscovered', (result: any) => {
      const deviceId = result.device.id;
      const deviceName = result.device.name || null;

      // Filter for EchoSOS advertisement patterns
      const isEchoSOSRegistration = this.isEchoSOSRegistration(deviceName);
      const isEchoSOSEmergency = this.isEchoSOSEmergency(deviceName);

      if (isEchoSOSRegistration || isEchoSOSEmergency) {
        const discoveredDevice: DiscoveredDevice = {
          id: deviceId,
          name: deviceName,
          advertising: result.device.advertising,
          rssi: result.rssi,
        };

        this.foundDevices.set(deviceId, discoveredDevice);
        this.onDeviceFound(discoveredDevice);
      }
    });

    // Listen for scan results completion
    BluetoothLePlugin.addListener('onScanResult', (result: any) => {
      // This event provides scan results during the scan
    });

    // Listen for scan stop
    BluetoothLePlugin.addListener('onScanStop', (result: any) => {
      console.log('Scan stopped', result);
    });
  }

  private isEchoSOSRegistration(name: string | null): boolean {
    if (!name) return false;
    // Pattern: EchoSOS-r-... (registration mode)
    return name.startsWith('EchoSOS-r-');
  }

  private isEchoSOSEmergency(name: string | null): boolean {
    if (!name) return false;
    // Pattern: EchoSOS-e-... (emergency alert mode)
    return name.startsWith('EchoSOS-e-');
  }

  private async checkAvailability(): Promise<boolean> {
    const result: any = await BluetoothLePlugin.isBluetoothAvailable();
    return result.available;
  }

  private async requestPermissions(): Promise<void> {
    // On iOS, we need to request location permission for BLE scanning
    const result: any = await BluetoothLePlugin.requestPermissions();
    console.log('Bluetooth permissions result:', result);
  }

  /**
   * Stop scanning for BLE devices
   */
  async stopScan(): Promise<void> {
    await BluetoothLePlugin.stopScan();
    this.foundDevices.clear();
  }

  /**
   * Get all discovered EchoSOS devices
   */
  getFoundDevices(): DiscoveredDevice[] {
    return Array.from(this.foundDevices.values());
  }

  /**
   * Event callback - override or provide your own handler
   */
  protected onDeviceFound(device: DiscoveredDevice): void {
    console.log('Found EchoSOS device:', device);
    // This method can be overridden or you can add an event emitter
  }
}

export default BLEScanner;