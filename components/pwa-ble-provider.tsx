'use client';

import { useEffect } from 'react';
import { bleScanner } from '@/lib/ble-background-scanner';
import { useAuth } from '@/lib/auth-context';

export function PWABLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Start BLE scanning and location tracking when user is authenticated
    if (user) {
      bleScanner.requestPermissions().then(() => {
        bleScanner.startScanning();
      });
    } else {
      bleScanner.stopScanning();
    }

    return () => {
      bleScanner.stopScanning();
    };
  }, [user]);

  return <>{children}</>;
}
