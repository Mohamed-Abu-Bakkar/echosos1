'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { BottomNav } from '@/components/ui/bottom-nav';

/** Routes that render their own full-screen layout (no bottom tab bar). */
const NO_TAB_BAR = ['/login', '/splash', '/track', '/alert'];

/**
 * Client shell for the Capacitor / static export app:
 * - centers every route inside the mobile frame
 * - renders the bottom tab bar on app screens
 * - clears any legacy PWA service worker left over from earlier builds
 *   (it cached the dashboard forever and broke navigation in packaged apps)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => keys.filter((k) => k.startsWith('echosos')).map((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);

  const showTabBar = !NO_TAB_BAR.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  return (
    <main className="flex-1 flex justify-center items-stretch w-full p-0 sm:px-4 sm:pb-6">
      <PhoneFrame>{children}</PhoneFrame>
      {showTabBar && <BottomNav />}
    </main>
  );
}
