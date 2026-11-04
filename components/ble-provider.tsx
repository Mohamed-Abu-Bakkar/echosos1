'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bleCapacitorScanner } from '@/lib/ble-capacitor-scanner';
import { useAuth } from '@/lib/auth-context';
import { Capacitor } from '@capacitor/core';

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSOSTriggered = () => router.push('/alert');
    window.addEventListener('echosos:sos-triggered', handleSOSTriggered);

    if (Capacitor.isNativePlatform() && user) {
      bleCapacitorScanner.requestPermissions().then(() => {
        bleCapacitorScanner.startScanning();
      });
    }

    return () => {
      window.removeEventListener('echosos:sos-triggered', handleSOSTriggered);
      if (Capacitor.isNativePlatform()) {
        bleCapacitorScanner.stopScanning();
      }
    };
  }, [user]);

  return <>{children}</>;
}
