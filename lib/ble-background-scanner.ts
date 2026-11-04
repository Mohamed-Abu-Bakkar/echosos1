/**
 * Background BLE scanner exported for the diagnostics screen.
 * Delegates to the Capacitor-based BLE scanner.
 */
import { CapacitorBLEScanner } from './ble-capacitor-scanner';

export class BackgroundBLEScanner {
  private scanner: CapacitorBLEScanner;

  constructor() {
    this.scanner = new CapacitorBLEScanner();
  }

  async requestPermissions(): Promise<boolean> {
    return this.scanner.requestPermissions();
  }

  async isAvailable(): Promise<boolean> {
    return this.scanner.isAvailable();
  }

  async initialize(): Promise<boolean> {
    return this.scanner.initialize();
  }

  async startScanning(): Promise<void> {
    return this.scanner.startScanning();
  }

  async stopScanning(): Promise<void> {
    return this.scanner.stopScanning();
  }
}
