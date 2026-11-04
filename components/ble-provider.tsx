'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bleCapacitorScanner } from '@/lib/ble-capacitor-scanner';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';
import * as api from '@/lib/api';
import { bleEventBus } from '@/lib/ble-events';
import { buildBeaconLocalName, type BeaconMode } from '@/lib/ble-protocol';
import {
  addBackgroundBeaconListener,
  addBackgroundSosReportedListener,
  startBackgroundMonitoring,
  updateBackgroundNotificationOptions,
} from '@/lib/background-monitor';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;
    let cancellationPromptOpen = false;
    let removeNativeBeaconListener: (() => void) | undefined;
    let removeNativeSosListener: (() => void) | undefined;

    const handleSOSTriggered = () => router.push('/alert');
    const handleCancelRequested = async (event: Event) => {
      if (cancellationPromptOpen) return;
      const customEvent = event as CustomEvent<{ beaconId: string; eventId?: string }>;
      const beaconId = customEvent.detail?.beaconId;
      if (!beaconId) return;

      cancellationPromptOpen = true;
      try {
        const confirmed = window.confirm(
          "The EchoSOS beacon sent a cancellation signal. Was the emergency a false alert?\n\nChoose OK to cancel the SOS and send a false-alert SMS to all saved emergency contacts. Choose Cancel to keep the emergency active."
        );
        if (!confirmed) return;

        const result = await api.cancelAlert({
          eventId: customEvent.detail.eventId,
          beaconId,
          bleVerified: false,
        });
        if (!result.success) {
          window.alert(result.message || "Could not cancel the SOS. The emergency remains active.");
          return;
        }
        bleCapacitorScanner.resetAlertDedupe();
        window.alert(result.message || "SOS cancelled. Cancellation messages have been submitted.");
        router.push('/');
      } catch (error) {
        console.error('BLE cancellation confirmation failed:', error);
        window.alert("Could not complete SOS cancellation. Please use the Cancel Alert button on the alert screen.");
      } finally {
        cancellationPromptOpen = false;
      }
    };

    window.addEventListener('echosos:sos-triggered', handleSOSTriggered);
    window.addEventListener('echosos:cancel-requested', handleCancelRequested);

    if (Capacitor.getPlatform() === 'android' && user) {
      void (async () => {
        const beaconHandle = await addBackgroundBeaconListener((event) => {
          const mode = event.mode as BeaconMode | undefined;
          const beaconName = mode && event.beaconId
            ? buildBeaconLocalName(mode, event.beaconId)
            : event.name || 'EchoSOS Beacon';

          if (event.mac) {
            bleEventBus.emit({
              name: beaconName,
              mac: event.mac,
              signal: typeof event.rssi === 'number' ? event.rssi + ' dBm' : 'N/A',
              available: Boolean(event.available),
              rawName: beaconName,
            });
          }

          if (mode === 'c' && event.beaconId) {
            window.dispatchEvent(new CustomEvent('echosos:cancel-requested', {
              detail: { beaconId: event.beaconId, eventId: event.eventId || undefined },
            }));
          }
        });
        if (disposed) {
          void beaconHandle?.remove();
          return;
        }
        removeNativeBeaconListener = beaconHandle ? () => { void beaconHandle.remove(); } : undefined;

        const sosHandle = await addBackgroundSosReportedListener(() => {
          window.dispatchEvent(new Event('echosos:sos-triggered'));
        });
        if (disposed) {
          void sosHandle?.remove();
          return;
        }
        removeNativeSosListener = sosHandle ? () => { void sosHandle.remove(); } : undefined;

        const preferences = await api.getPreferences();
        if (preferences.success && preferences.preferences) {
          await updateBackgroundNotificationOptions({
            showBluetoothStatus: preferences.preferences.background_notification_show_bluetooth_status ?? true,
            showBeaconStatus: preferences.preferences.background_notification_show_beacon_status ?? true,
            showLastDetection: preferences.preferences.background_notification_show_last_detection ?? true,
            showLastSosEvent: preferences.preferences.background_notification_show_last_sos_event ?? true,
          });
        }

        if (!disposed) await startBackgroundMonitoring();
      })().catch((error) => {
        console.error('Native background BLE monitoring could not start:', error);
      });
    } else if (Capacitor.getPlatform() === 'ios' && user) {
      void bleCapacitorScanner.requestPermissions().then((granted) => {
        if (!disposed && granted) return bleCapacitorScanner.startScanning();
        return undefined;
      }).catch((error) => console.error('BLE scanning could not start:', error));
    }

    return () => {
      disposed = true;
      window.removeEventListener('echosos:sos-triggered', handleSOSTriggered);
      window.removeEventListener('echosos:cancel-requested', handleCancelRequested);
      removeNativeBeaconListener?.();
      removeNativeSosListener?.();

      // Android monitoring is owned by the foreground service, not by the
      // React provider lifecycle. Explicit logout stops it in lib/api.ts.
      if (Capacitor.getPlatform() === 'ios') {
        void bleCapacitorScanner.stopScanning();
      }
    };
  }, [user, router]);

  return <>{children}</>;
}
