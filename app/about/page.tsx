'use client';

import Link from 'next/link';
import { ArrowLeft, Bluetooth, MapPin, MessageSquareText, ShieldCheck, Radio, HeartHandshake } from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';

const capabilities = [
  {
    icon: Radio,
    title: 'Beacon-based SOS',
    description: 'An ESP32-S3 Bluetooth Low Energy beacon can initiate an emergency alert when its SOS mode is activated.',
  },
  {
    icon: MapPin,
    title: 'Location sharing',
    description: 'The app obtains the phone’s available location and includes it with the emergency alert when location access is available.',
  },
  {
    icon: MessageSquareText,
    title: 'Emergency contacts',
    description: 'Saved emergency contacts can receive SOS messages. Cancellation messages can also be sent when an alert is cancelled.',
  },
  {
    icon: Bluetooth,
    title: 'Bluetooth connection',
    description: 'EchoSOS uses BLE beacon advertisements to identify registration, emergency, and cancellation events.',
  },
];

export default function AboutPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col gap-5 overflow-y-auto bg-[#F4F8FF] px-4 py-4 pb-20">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <EchoLogo size="sm" inline />
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-[#0B3C85] to-[#1764B5] p-5 text-white shadow-lg shadow-blue-900/10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">About the project</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">EchoSOS</h1>
        <p className="mt-2 text-sm leading-relaxed text-blue-50">
          A connected emergency alert system designed to help users send SOS alerts using a mobile app and a compact Bluetooth Low Energy beacon.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-black text-[#0B3C85]">What EchoSOS does</h2>
        <p className="text-xs leading-relaxed text-slate-600">
          EchoSOS brings together an Android mobile application, an ESP32-S3 BLE beacon, and a cloud backend. The system is designed to share an emergency alert with saved contacts and provide a way to cancel an alert when it is no longer needed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black text-[#0B3C85]">Core capabilities</h2>
        <div className="space-y-2.5">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B3C85]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p className="text-[11px] leading-relaxed text-amber-900">
          EchoSOS is a project prototype. It does not replace official emergency services. SMS submission and location availability depend on device permissions, network coverage, and the phone’s capabilities.
        </p>
      </div>

      <p className="text-center text-[10px] font-medium text-slate-400">EchoSOS · Emergency assistance technology</p>
    </main>
  );
}
