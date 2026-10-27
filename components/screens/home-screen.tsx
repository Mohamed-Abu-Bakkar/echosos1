'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Bluetooth, 
  MapPin, 
  ChevronRight, 
  Compass, 
  Users, 
  Clock, 
  Settings, 
  ShieldCheck,
  Radio,
  Loader2
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmergencyContact } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
  onTriggerSOS?: () => void;
}

export function HomeScreen({ onNavigate, onTriggerSOS }: HomeScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    // Fetch live emergency contacts from backend
    fetch('/api/contacts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.contacts) {
          setContacts(data.contacts);
        }
      })
      .catch(() => {});
  }, []);

  const handleSOSTrigger = async () => {
    setIsTriggering(true);
    try {
      // Trigger distress call on backend API
      await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 10.8247,
          longitude: 78.6956,
        }),
      });
    } catch (err) {
      console.error('Failed to dispatch SOS alert to backend:', err);
    } finally {
      setIsTriggering(false);
      if (onTriggerSOS) {
        onTriggerSOS();
      } else if (onNavigate) {
        onNavigate('alert');
      } else {
        router.push('/alert');
      }
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'NK';

  return (
    <div className="flex flex-col flex-1 w-full bg-[#F4F8FF] px-4 py-4 overflow-y-auto no-scrollbar space-y-4 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <EchoLogo size="sm" inline={true} />
        <button
          onClick={() => onNavigate ? onNavigate('settings') : router.push('/settings')}
          className="rounded-full ring-2 ring-[#0B3C85]/20 hover:ring-[#0B3C85] transition-all focus:outline-none"
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#0B3C85] text-white font-bold text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Greeting Card with dynamic user name */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0B3C85] tracking-tight">
            Hello, {user?.name || 'Nithish'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Stay safe. We are always with you.
          </p>
        </div>
        <button
          onClick={() => onNavigate ? onNavigate('beacon') : router.push('/beacon')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Device Connected</span>
          <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
        </button>
      </div>

      {/* Primary SOS Trigger - Concentric Red Circles */}
      <div className="flex flex-col items-center justify-center py-3 select-none">
        <div className="relative flex items-center justify-center">
          {/* Outer Wave 1 */}
          <div className="absolute w-44 h-44 rounded-full bg-[#E52E3D]/10 animate-ping opacity-35" />
          {/* Outer Wave 2 */}
          <div className="absolute w-40 h-40 rounded-full bg-[#E52E3D]/20 animate-pulse-ring" />
          {/* Middle Wave */}
          <div className="w-36 h-36 rounded-full bg-[#E52E3D]/25 flex items-center justify-center p-3">
            {/* Inner Ring */}
            <div className="w-28 h-28 rounded-full bg-[#E52E3D]/40 flex items-center justify-center p-2">
              {/* Core SOS Button */}
              <button
                type="button"
                onClick={handleSOSTrigger}
                disabled={isTriggering}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#c41c2a] via-[#E52E3D] to-[#ff4d5c] shadow-xl shadow-[#E52E3D]/50 flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-transform animate-pulse-glow disabled:opacity-80"
              >
                {isTriggering ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-7 h-7 drop-shadow-md stroke-[2.5]" />
                    <span className="text-base font-black tracking-wider drop-shadow-md mt-0.5">
                      SOS
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-500 mt-3 tracking-wide">
          Press in case of emergency
        </p>
      </div>

      {/* Status Row (2 Grid Columns) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Beacon Status */}
        <div 
          onClick={() => onNavigate ? onNavigate('beacon') : router.push('/beacon')}
          className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm cursor-pointer hover:border-blue-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B3C85]">
              <Bluetooth className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
              Beacon Status
            </span>
            <span className="text-sm font-black text-emerald-600 block mt-0.5">
              Connected
            </span>
            <span className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
              ESP32-S3 (EchoSOS)
            </span>
          </div>
        </div>

        {/* Card 2: Location Status */}
        <div 
          onClick={() => onNavigate ? onNavigate('alert') : router.push('/alert')}
          className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm cursor-pointer hover:border-emerald-200 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <MapPin className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
              Location Status
            </span>
            <span className="text-sm font-black text-[#0F172A] block mt-0.5">
              Enabled
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              GPS Active (Accuracy 5m)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links (4 Columns) */}
      <div>
        <div className="grid grid-cols-4 gap-2">
          {/* 1. View Location */}
          <button
            onClick={() => onNavigate ? onNavigate('alert') : router.push('/alert')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B3C85] group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 mt-1.5 text-center leading-tight">
              View Location
            </span>
          </button>

          {/* 2. Emergency Contacts */}
          <button
            onClick={() => onNavigate ? onNavigate('contacts') : router.push('/contacts')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 mt-1.5 text-center leading-tight">
              Emergency Contacts
            </span>
          </button>

          {/* 3. Alert History */}
          <button
            onClick={() => onNavigate ? onNavigate('history') : router.push('/history')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 mt-1.5 text-center leading-tight">
              Alert History
            </span>
          </button>

          {/* 4. Settings */}
          <button
            onClick={() => onNavigate ? onNavigate('settings') : router.push('/settings')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:bg-slate-50 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 mt-1.5 text-center leading-tight">
              Settings
            </span>
          </button>
        </div>
      </div>

      {/* Contacts Card Preview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">
              Emergency Contacts
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {contacts.length} contacts configured & active
            </span>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate('contacts') : router.push('/contacts')}
            className="text-[11px] font-bold text-[#0B3C85] hover:underline"
          >
            Manage
          </button>
        </div>

        <div className="pt-3 space-y-2.5">
          {contacts.slice(0, 3).map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-2 rounded-xl bg-[#F4F8FF] border border-slate-100"
            >
              <div className="flex items-center space-x-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-[#0B3C85] text-white font-bold text-[11px]">
                    {contact.initials || 'EC'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {contact.name}
                    </span>
                    {contact.is_primary && (
                      <span className="text-[9px] bg-red-50 text-[#E52E3D] px-1.5 py-0.2 rounded font-bold border border-red-200/50">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {contact.phone}
                  </span>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
