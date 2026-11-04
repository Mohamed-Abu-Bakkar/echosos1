import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface BackgroundNotificationOptions {
  showBluetoothStatus: boolean;
  showBeaconStatus: boolean;
  showLastDetection: boolean;
  showLastSosEvent: boolean;
}

interface MonitorPermissions {
  bluetoothGranted: boolean;
  locationGranted: boolean;
  notificationsGranted: boolean;
}

export interface NativeBeaconEvent {
  name?: string;
  mac?: string;
  beaconId?: string;
  eventId?: string;
  mode?: string;
  rssi?: number;
  available?: boolean;
}

export interface NativeSosReportedEvent {
  beaconId?: string;
  eventId?: string;
}

interface EchoSOSMonitorPlugin {
  requestMonitorPermissions(): Promise<MonitorPermissions>;
  startMonitoring(options: { convexSiteUrl: string }): Promise<{ started: boolean }>;
  getNotificationOptions(): Promise<BackgroundNotificationOptions>;
  updateNotificationOptions(options: Partial<BackgroundNotificationOptions>): Promise<void>;
  stopMonitoring(): Promise<void>;
  addListener(
    eventName: "beaconDetected",
    listener: (event: NativeBeaconEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "sosReported",
    listener: (event: NativeSosReportedEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS: BackgroundNotificationOptions = {
  showBluetoothStatus: true,
  showBeaconStatus: true,
  showLastDetection: true,
  showLastSosEvent: true,
};

const NativeMonitor = registerPlugin<EchoSOSMonitorPlugin>("EchoSOSMonitor");

function getConvexSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing from this native build.");

  const normalized = url.trim().replace(/\/+$/, "");
  return normalized.replace(/\.convex\.cloud$/i, ".convex.site");
}

export function isNativeBackgroundMonitorAvailable(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function startBackgroundMonitoring(): Promise<void> {
  if (!isNativeBackgroundMonitorAvailable()) return;

  const permissions = await NativeMonitor.requestMonitorPermissions();
  if (!permissions.bluetoothGranted) {
    throw new Error("Bluetooth permission is required for background beacon monitoring.");
  }

  await NativeMonitor.startMonitoring({ convexSiteUrl: getConvexSiteUrl() });
  if (!permissions.notificationsGranted) {
    console.warn("Android may show the foreground service only in Task Manager when notification permission is denied.");
  }
  if (!permissions.locationGranted) {
    console.warn("Location permission was not granted; background SOS reports may not include coordinates.");
  }
}

export async function getBackgroundNotificationOptions(): Promise<BackgroundNotificationOptions> {
  if (!isNativeBackgroundMonitorAvailable()) return DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS;
  try {
    return {
      ...DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS,
      ...(await NativeMonitor.getNotificationOptions()),
    };
  } catch {
    return DEFAULT_BACKGROUND_NOTIFICATION_OPTIONS;
  }
}

export async function updateBackgroundNotificationOptions(
  options: Partial<BackgroundNotificationOptions>,
): Promise<void> {
  if (!isNativeBackgroundMonitorAvailable()) return;
  await NativeMonitor.updateNotificationOptions(options);
}

export async function stopBackgroundMonitoring(): Promise<void> {
  if (!isNativeBackgroundMonitorAvailable()) return;
  await NativeMonitor.stopMonitoring();
}

export async function addBackgroundBeaconListener(
  listener: (event: NativeBeaconEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!isNativeBackgroundMonitorAvailable()) return null;
  return NativeMonitor.addListener("beaconDetected", listener);
}

export async function addBackgroundSosReportedListener(
  listener: (event: NativeSosReportedEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!isNativeBackgroundMonitorAvailable()) return null;
  return NativeMonitor.addListener("sosReported", listener);
}
