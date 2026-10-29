/**
 * BLE background scanner stub.
 *
 * Capacitor/Bluetooth support has been removed from this web build.
 * This stub returns an empty device list so the app builds without
 * native Capacitor dependencies.
 */
export class BackgroundBLEScanner {
  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async startScanning(): Promise<void> {
    return;
  }

  async stopScanning(): Promise<void> {
    return;
  }
}
