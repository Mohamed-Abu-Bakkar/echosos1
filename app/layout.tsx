import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { NavigationBarSimulator } from '@/components/navigation-bar-simulator';
import { AuthProvider } from '@/lib/auth-context';
import { PWAProvider } from '@/components/pwa-provider';

export const metadata: Metadata = {
  title: 'EchoSOS - Emergency Safety Network & ESP32 BLE Beacon',
  description: 'Replicate the exact UI design, layouts, components, and styling of the EchoSOS safety application.',
  manifest: '/manifest.json',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F4F8FF' }],
  icons: [
    { rel: 'icon', type: 'image/svg+xml', sizes: '192x192', href: '/icons/icon-192.svg' },
    { rel: 'icon', type: 'image/svg+xml', sizes: '512x512', href: '/icons/icon-512.svg' },
    { rel: 'apple-touch-icon', sizes: '192x192', href: '/icons/icon-192.svg' },
    { rel: 'apple-touch-icon', sizes: '512x512', href: '/icons/icon-512.svg' },
  ],
  openGraph: {
    title: 'EchoSOS - Emergency Safety Network',
    description: 'Emergency Safety Mobile Web Application with live GPS telemetry and distress signal dispatching.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
        <PWAProvider />
        <AuthProvider>
          {/* <header>
            <Suspense fallback={null}>
              <NavigationBarSimulator />
            </Suspense>
          </header> */}
          <main className="flex-1 flex justify-center items-stretch w-full p-0 sm:px-4 sm:pb-6">
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
