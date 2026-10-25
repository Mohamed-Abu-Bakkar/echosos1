'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Sparkles, 
  Smartphone, 
  Bell, 
  Radio, 
  Users, 
  Settings, 
  History, 
  ShieldAlert, 
  LogIn,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavigationBarSimulator() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  const screens = [
    { name: '1. Splash', path: '/splash', icon: Sparkles },
    { name: '2. Login', path: '/login', icon: LogIn },
    { name: '3. Home', path: '/', icon: Smartphone },
    { name: '4. Beacon', path: '/beacon', icon: Radio },
    { name: '5. Alert (SOS)', path: '/alert', icon: ShieldAlert, highlight: true },
    { name: '6. Contacts', path: '/contacts', icon: Users },
    { name: '7. Settings', path: '/settings', icon: Settings },
    { name: '8. Notifications', path: '/notifications', icon: Bell },
    { name: '8. History', path: '/history', icon: History },
  ];

  return (
    <aside aria-label="Screen Switcher" className="w-full max-w-md mx-auto pt-2 pb-1 px-3 z-40 select-none">
      <div className="flex items-center justify-between py-1 px-2 text-xs text-slate-500 font-semibold">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1.5 hover:text-slate-800 transition-colors focus:outline-none"
        >
          <Layers className="w-3.5 h-3.5 text-[#0B3C85]" />
          <span className="text-[11px] font-bold text-slate-700">EchoSOS 8-Screen Switcher</span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </button>
        <span className="text-[10px] text-slate-400 font-medium">
          Mobile-First
        </span>
      </div>

      {isExpanded && (
        <nav
          aria-label="Demo Screens"
          className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar mt-1 animate-in fade-in duration-200"
        >
          {screens.map((screen) => {
            const Icon = screen.icon;
            const isActive = pathname === screen.path;
            return (
              <Link
                key={screen.path}
                href={screen.path}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap',
                  isActive
                    ? screen.highlight
                      ? 'bg-[#E52E3D] text-white shadow-2xs'
                      : 'bg-[#0B3C85] text-white shadow-2xs'
                    : screen.highlight
                    ? 'text-[#E52E3D] hover:bg-red-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{screen.name}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
