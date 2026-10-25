'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
  statusBarColor?: 'light' | 'dark' | 'red';
  showStatusBar?: boolean;
}

export function PhoneFrame({
  children,
  className,
}: PhoneFrameProps) {
  return (
    <div className="w-full flex-1 flex justify-center items-start">
      {/* Mobile-first app container without device bezels, fake status bar, or notches */}
      <div
        className={cn(
          'w-full max-w-md min-h-screen bg-[#F4F8FF] flex flex-col relative sm:shadow-xl sm:border sm:border-slate-200/80 sm:rounded-2xl overflow-hidden',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
