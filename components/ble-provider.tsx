'use client';

import { useEffect } from 'react';
import { bleCapacitorScanner } from '@/lib/ble-capacitor-scanner';
import { bleScanner } from '@/lib/ble-background-scanner';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isNative = Capacitor.isNativePlatform();
    
    if (user) {
      if (isNative) {
        bleCapacitorScanner.requestPermissions().then(() => {
          bleCapacitorScanner.startScanning();
        });
      } else {
        bleScanner.requestPermissions().then(() => {
          bleScanner.startScanning();
        });
      }
    } else {
      if (isNative) {
        bleCapacitorScanner.stopScanning();
      } else {
        bleScanner.stopScanning();
      }
    }

    return () => {
      if (isNative) {
        bleCapacitorScanner.stopScanning();
      } else {
        bleScanner.stopScanning();
      }
    };
  }, [user]);

  return <>{children}</>;
}
