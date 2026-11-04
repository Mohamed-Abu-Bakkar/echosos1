'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bleCapacitorScanner } from '@/lib/ble-capacitor-scanner';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';
import * as api from '@/lib/api';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSOSTriggered = () => router.push('/alert');
    let cancellationPromptOpen = false;
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
        // The same beacon is now allowed to trigger a fresh SOS episode.
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

    if (Capacitor.isNativePlatform() && user) {
      bleCapacitorScanner.requestPermissions().then(() => {
        bleCapacitorScanner.startScanning();
      });
    }

    return () => {
      window.removeEventListener('echosos:sos-triggered', handleSOSTriggered);
      window.removeEventListener('echosos:cancel-requested', handleCancelRequested);
      if (Capacitor.isNativePlatform()) {
        bleCapacitorScanner.stopScanning();
      }
    };
  }, [user]);

  return <>{children}</>;
}
