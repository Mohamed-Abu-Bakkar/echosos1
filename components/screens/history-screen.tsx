'use client';
import { useRouter } from "next/navigation";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  MapPin, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Bluetooth, 
  RefreshCw, 
  BatteryLow,
  ArrowLeft 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertHistory, StatusBadge } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

interface HistoryScreenProps {
  onNavigate?: (screen: string) => void;
}

export function HistoryScreen({ onNavigate }: HistoryScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Route guard: require an active session
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);
  const [historyList, setHistoryList] = useState<AlertHistory[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SOS' | 'SYSTEM' | 'UPDATES'>('ALL');
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = async (filter: string) => {
    try {
      const data = await api.getHistory(filter === 'ALL' ? undefined : filter);
      if (data.success && data.history) {
        setHistoryList(data.history);
        if (data.totalRecords) setTotalCount(data.totalRecords);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchHistory(activeFilter);
  }, [activeFilter]);

  const getStatusBadge = (status: StatusBadge) => {
    switch (status) {
      case 'Alert Sent':
        return (
          <Badge className="bg-red-50 text-[#E52E3D] border border-red-200 hover:bg-red-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E52E3D]" />
            Alert Sent
          </Badge>
        );
      case 'Delivered':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Delivered
          </Badge>
        );
      case 'Connected':
        return (
          <Badge className="bg-blue-50 text-[#0B3C85] border border-blue-200 hover:bg-blue-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B3C85]" />
            Connected
          </Badge>
        );
      case 'Updated':
        return (
          <Badge className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Updated
          </Badge>
        );
      case 'Warning':
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Warning
          </Badge>
        );
      case 'Disconnected':
        return (
          <Badge className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Disconnected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'SOS_ALERT':
        return <AlertTriangle className="w-4 h-4 text-[#E52E3D]" />;
      case 'CONTACT_DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'BEACON_CONNECTED':
        return <Bluetooth className="w-4 h-4 text-[#0B3C85]" />;
      case 'LOW_BATTERY':
        return <BatteryLow className="w-4 h-4 text-amber-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
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
        <div className="flex items-center space-x-2">
          {onNavigate ? (
            <button
              onClick={() => onNavigate('home')}
              className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/"
              className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <EchoLogo size="sm" inline={true} />
        </div>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-[#0B3C85] text-white font-bold text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Alert & Event History
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Comprehensive audit log of all beacons, triggers, and contact dispatches.
        </p>
      </div>

      {/* Filter Segment Control (Pill Buttons) */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-full border border-slate-200/80 overflow-x-auto no-scrollbar shadow-2xs">
        {(['ALL', 'SOS', 'SYSTEM', 'UPDATES'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-[#0B3C85] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {filter === 'ALL' ? 'All' : filter}
            </button>
          );
        })}
      </div>

      {/* History Event Cards */}
      <div className="space-y-2.5">
        {historyList.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col space-y-2 hover:border-blue-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-slate-50">
                  {getEventIcon(item.event_type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    {item.event_type.replace('_', ' ')}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.created_at}
                  </span>
                </div>
              </div>

              {/* Color Coded Status Badge */}
              <div>{getStatusBadge(item.status_badge as StatusBadge)}</div>
            </div>

            {/* Coordinates / Details row if present */}
            {item.latitude && item.longitude && (
              <div className="pt-1.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <MapPin className="w-3 h-3 text-[#E52E3D]" />
                  <span>
                    {Number(item.latitude).toFixed(4)}° N, {Number(item.longitude).toFixed(4)}° E
                  </span>
                </div>
                <span className="text-[10px] text-[#0B3C85] font-semibold flex items-center">
                  GPS Logged <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Pagination Text */}
      <div className="pt-2 pb-3 text-center">
        <p className="text-xs font-semibold text-slate-400">
          Showing {historyList.length} of {totalCount} records
        </p>
      </div>
    </div>
  );
}
