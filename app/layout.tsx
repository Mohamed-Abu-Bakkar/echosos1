import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { BLEProvider } from "@/components/ble-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EchoSOS",
  description:
    "Emergency safety mobile application with ESP32 BLE beacon pairing, SOS dispatch, live tracking, and emergency contacts.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", type: "image/svg+xml", sizes: "192x192", url: "/icons/icon-192.svg" },
    { rel: "icon", type: "image/svg+xml", sizes: "512x512", url: "/icons/icon-512.svg" },
    { rel: "apple-touch-icon", url: "/icons/icon-192.svg" },
  ],
  openGraph: {
    title: "EchoSOS",
    description: "Emergency Safety Mobile Web Application with live GPS telemetry and distress signal dispatching.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F8FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased min-h-screen bg-slate-100/70">
        <AuthProvider>
          <BLEProvider>
            <AppShell>{children}</AppShell>
          </BLEProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
