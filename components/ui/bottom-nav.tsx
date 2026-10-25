'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Radio, Users, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { id: 'home', label: 'Home', href: '/', icon: Home },
    { id: 'beacon', label: 'My Beacon', href: '/beacon', icon: Radio },
    { id: 'contacts', label: 'Contacts', href: '/contacts', icon: Users },
    { id: 'history', label: 'History', href: '/history', icon: History },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
  ];

  const getIsActive = (tabId: string, tabHref: string) => {
    if (activeTab) return activeTab === tabId;
    if (tabHref === '/' && pathname === '/') return true;
    if (tabHref !== '/' && pathname?.startsWith(tabHref)) return true;
    return false;
  };

  return (
    <nav className="h-16 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 shrink-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] sticky bottom-0 w-full">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = getIsActive(tab.id, tab.href);

        const content = (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 select-none group',
              isActive
                ? 'text-[#0B3C85]'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <div className={cn('relative p-1 rounded-full transition-transform', isActive && 'scale-110')}>
              <Icon className={cn('w-5 h-5 transition-colors', isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]')} />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0B3C85] rounded-full" />
              )}
            </div>
            <span
              className={cn(
                'text-[10px] tracking-tight mt-0.5',
                isActive ? 'font-bold text-[#0B3C85]' : 'font-medium text-slate-400'
              )}
            >
              {tab.label}
            </span>
          </div>
        );

        if (onTabChange) {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="focus:outline-none"
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={tab.id} href={tab.href} className="focus:outline-none">
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
