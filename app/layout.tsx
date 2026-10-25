import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { NavigationBarSimulator } from '@/components/navigation-bar-simulator';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'EchoSOS - Emergency Safety Network & ESP32 BLE Beacon',
  description: 'Replicate the exact UI design, layouts, components, and styling of the EchoSOS safety application.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
        <AuthProvider>
          <header>
            <Suspense fallback={null}>
              <NavigationBarSimulator />
            </Suspense>
          </header>
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
