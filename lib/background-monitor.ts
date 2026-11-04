import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface BackgroundNotificationOptions {
  showBluetoothStatus: boolean;
  showBeaconStatus: boolean;
  showLastDetection: boolean;
  showLastSosEvent: boolean;
}

interface MonitorPermissions {
  bluetoothGranted: boolean;
  notificationsGranted: boolean;
}

interface NativeBeaconEvent {
  name?: string;
  mac?: string;
  beaconId?: string;
  eventId?: string;
  mode?: string;
  rssi?: number;
}

interface EchoSOSMonitorPlugin {
  requestMonitorPermissions(): Promise<MonitorPermissions>;
  startMonitoring(options: { convexUrl: string }): Promise<{ started: boolean }>;
  getNotificationOptions(): Promise<BackgroundNotificationOptions>;
  updateNotificationOptions(options: Partial<BackgroundNotificationOptions>): Promise<void>;
  stopMonitoring(): Promise<void>;
  addListener(
    eventName: 'beaconDetected',
    listener: (event: NativeBeaconEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS: BackgroundNotificationOptions = {
  showBluetoothStatus: true,
  showBeaconStatus: true,
  showLastDetection: true,
  showLastSosEvent: true,
};

const NativeMonitor = registerPlugin<EchoSOSMonitorPlugin>('EchoSOSMonitor');

export function isNativeBackgroundMonitorAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function startBackgroundMonitoring(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permissions = await NativeMonitor.requestMonitorPermissions();
  if (!permissions.bluetoothGranted) {
    throw new Error('Bluetooth permission is required for background beacon monitoring.');
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is missing from this native build.');
  }

  await NativeMonitor.startMonitoring({ convexUrl });
  if (!permissions.notificationsGranted) {
    console.warn('EchoSOS notification permission is denied; Android may not show the ongoing notification in the notification shade.');
  }
}

export async function getBackgroundNotificationOptions(): Promise<BackgroundNotificationOptions> {
  if (!Capacitor.isNativePlatform()) return DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS;
  try {
    return { ...DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS, ...(await NativeMonitor.getNotificationOptions()) };
  } catch {
    return DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS;
  }
}

export async function updateBackgroundNotificationOptions(
  options: Partial<BackgroundNotificationOptions>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await NativeMonitor.updateNotificationOptions(options);
}

export async function stopBackgroundMonitoring(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await NativeMonitor.stopMonitoring();
}

export async function addBackgroundBeaconListener(
  listener: (event: NativeBeaconEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return NativeMonitor.addListener('beaconDetected', listener);
}

export type { NativeBeaconEvent };
