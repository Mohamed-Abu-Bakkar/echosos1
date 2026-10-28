'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  Bluetooth,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import * as api from '@/lib/api';

export default function SplashScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const steps = [
      'Initializing EchoSOS…',
      'Checking Bluetooth…',
      'Verifying session…',
      'Ready',
    ];
    let i = 0;
    const timer = setInterval(() => {
      setStep((i++) % steps.length);
    }, 800);

    api
      .getMe()
      .then((data) => {
        if (data.authenticated && data.user) {
          setIsLoading(false);
          setTimeout(() => router.push('/'), 1500);
        } else {
          setIsLoading(false);
          setTimeout(() => router.push('/login'), 1500);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setTimeout(() => router.push('/login'), 1500);
      });

    return () => clearInterval(timer);
  }, []);

  const steps = [
    { label: 'Initializing EchoSOS…', icon: <ShieldCheck className="w-5 h-5" /> },
    { label: 'Checking Bluetooth…', icon: <Bluetooth className="w-5 h-5" /> },
    { label: 'Verifying session…', icon: <MapPin className="w-5 h-5" /> },
    { label: 'Ready', icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-screen w-full bg-[#F4F8FF] overflow-y-auto">
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="relative shrink-0 flex items-center justify-center w-16 h-16">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 8L16 23V48C16 71 31 90 50 96C69 90 84 71 84 48V23L50 8Z" fill="#0B3C85" />
            <path d="M50 14L22 27V48C22 67 34 83 50 88C66 83 78 67 78 48V27L50 14Z" fill="#0F4BA3" />
            <path d="M44 32C47.866 32 51 35.134 51 39C51 42.866 47.866 46 44 46C40.134 46 37 42.866 37 39C37 35.134 40.134 32 44 32Z" fill="white" />
            <path d="M44 48C37.5 48 32 53.5 32 60V64H56V60C56 53.5 50.5 48 44 48Z" fill="white" />
            <path d="M58 35C61.5 39.5 61.5 46.5 58 51" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M64 29C69.5 35.5 69.5 49.5 64 56" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M70 23C77.5 31.5 77.5 55 70 62" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <div className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] rounded-full bg-gradient-to-r from-[#0B3C85] to-[#E52E3D] -z-[-1] opacity-30 blur-md" />
        </div>
        <div className="mt-8 flex flex-col items-center text-center space-y-1">
          <h1 className="text-2xl font-black text-[#0B3C85] tracking-tight">EchoSOS</h1>
          <p className="text-xs text-slate-500">Emergency Safety with ESP32 BLE Beacons</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 px-6">
        <div className="w-full max-w-md space-y-4">
          {steps.map((s, idx) => (
            <div key={idx} className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${step === idx ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                {s.icon}
              </div>
              <span className="text-xs font-medium text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        <Link href="/" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors">
          Skip
        </Link>
      </div>
    </div>
  );
}
