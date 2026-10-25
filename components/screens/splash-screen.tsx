'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';

interface SplashScreenProps {
  onNavigate?: (screen: string) => void;
}

export function SplashScreen({ onNavigate }: SplashScreenProps) {
  const [loadingText, setLoadingText] = useState('Loading...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setLoadingText('Initializing Beacon BLE...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setLoadingText('Connecting to Safety Network...');
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="relative flex flex-col justify-between items-center min-h-screen flex-1 w-full bg-white px-6 py-12 select-none overflow-hidden">
      {/* Subtle Blue Gradient SVG Curves - Top Left */}
      <svg
        className="absolute -top-16 -left-16 w-64 h-64 opacity-40 pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0C60 0 160 40 180 120C200 200 120 220 120 220L0 220V0Z"
          fill="url(#blue-grad-top)"
        />
        <defs>
          <linearGradient id="blue-grad-top" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B3C85" stopOpacity="0.35" />
            <stop stopColor="#F4F8FF" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* Subtle Blue Gradient SVG Curves - Bottom Right */}
      <svg
        className="absolute -bottom-20 -right-20 w-72 h-72 opacity-50 pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M200 200C140 200 40 160 20 80C0 0 80 -20 80 -20L200 -20V200Z"
          fill="url(#blue-grad-bottom)"
        />
        <defs>
          <linearGradient id="blue-grad-bottom" x1="200" y1="200" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B3C85" stopOpacity="0.3" />
            <stop stopColor="#38BDF8" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="h-10" />

      {/* Centered EchoSOS Logo */}
      <div className="flex flex-col items-center justify-center my-auto z-10 animate-in fade-in zoom-in duration-700">
        <EchoLogo size="xl" showSubtitle={true} />

        {/* Brand Tagline & Version */}
        <p className="text-xs text-slate-400 mt-3 font-medium tracking-wide">
          ESP32 BLE Mesh • Real-Time Protection
        </p>
      </div>

      {/* Centered Blue Circular Spinner & Loading Text */}
      <div className="flex flex-col items-center justify-center space-y-3 z-10 mb-8">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0B3C85] animate-spin" />
          <div className="absolute w-12 h-12 rounded-full border-2 border-[#0B3C85]/20 animate-ping opacity-30" />
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide transition-all">
          {loadingText}
        </p>

        {/* Quick jump for interactive user demo */}
        <div className="pt-4 flex gap-2">
          {onNavigate ? (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0B3C85]/10 text-[#0B3C85] text-xs font-semibold hover:bg-[#0B3C85]/20 transition-colors"
            >
              Skip to Login <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0B3C85]/10 text-[#0B3C85] text-xs font-semibold hover:bg-[#0B3C85]/20 transition-colors"
            >
              Skip to Login <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
