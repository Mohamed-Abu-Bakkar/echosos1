'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, Languages, Palette, SlidersHorizontal, Sparkles } from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';

const upcoming = [
  { icon: Languages, title: 'Language', description: 'Choose your preferred app language.' },
  { icon: Palette, title: 'Appearance', description: 'Personalise the app display.' },
  { icon: Bell, title: 'Notification controls', description: 'Manage optional app notification preferences.' },
];

export default function AppPreferencesPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col gap-5 overflow-y-auto bg-[#F4F8FF] px-4 py-4 pb-20">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <EchoLogo size="sm" inline />
      </header>

      <section>
        <h1 className="text-xl font-black tracking-tight text-[#0B3C85]">App Preferences</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Your app experience, all in one place.</p>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white px-5 py-7 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0B3C85]">
          <Sparkles className="h-8 w-8" />
        </div>
        <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Coming soon</span>
        <h2 className="mt-3 text-lg font-black text-slate-900">A more personal EchoSOS</h2>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
          App preferences are being prepared and will be available in a future update. No settings on this page are active yet.
        </p>
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-black text-[#0B3C85]">Planned preferences</h2>
        {upcoming.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 opacity-75">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-slate-800">{title}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
            </div>
            <SlidersHorizontal className="h-4 w-4 text-slate-300" />
          </div>
        ))}
      </section>

      <p className="rounded-xl bg-blue-50/80 p-3 text-[11px] leading-relaxed text-blue-800">
        Emergency activation, beacon scanning, and safety-critical alert behaviour are not controlled from this page.
      </p>
    </main>
  );
}
