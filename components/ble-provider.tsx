'use client';

import { useEffect } from 'react';
import { bleCapacitorScanner } from '@/lib/ble-capacitor-scanner';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (Capacitor.isNativePlatform() && user) {
      bleCapacitorScanner.requestPermissions().then(() => {
        bleCapacitorScanner.startScanning();
      });
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        bleCapacitorScanner.stopScanning();
      }
    };
  }, [user]);

  return <>{children}</>;
}
