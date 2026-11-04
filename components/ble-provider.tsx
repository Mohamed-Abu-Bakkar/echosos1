'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';
import { bleEventBus } from '@/lib/ble-events';
import {
  addBackgroundBeaconListener,
  startBackgroundMonitoring,
} from '@/lib/background-monitor';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    let disposed = false;
    let listener: { remove: () => Promise<void> } | null = null;

    addBackgroundBeaconListener((event) => {
      const mac = event.mac || '';
      if (!mac) return;
      bleEventBus.emit({
        name: event.name || 'EchoSOS Beacon',
        mac,
        signal: typeof event.rssi === 'number' ? `${event.rssi} dBm` : 'N/A',
        available: true,
        rawName: event.name || '',
      });
    }).then((handle) => {
      if (disposed) {
        void handle?.remove();
      } else {
        listener = handle;
      }
    });

    // The native service is intentionally not tied to this React component's
    // lifecycle. It continues after the activity is swiped away.
    startBackgroundMonitoring().catch((error) => {
      console.error('Could not start EchoSOS background monitoring:', error);
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, [user]);

  return <>{children}</>;
}
