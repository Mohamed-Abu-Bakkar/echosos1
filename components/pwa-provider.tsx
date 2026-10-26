'use client';

import { useEffect } from 'react';

export function PWAProvider() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // eslint-disable-next-line no-console
          console.log('PWA Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.log('PWA Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
