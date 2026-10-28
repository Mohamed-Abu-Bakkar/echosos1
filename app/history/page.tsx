'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Bluetooth,
  RefreshCw,
  BatteryLow,
  ArrowLeft,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertHistory } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

interface HistoryScreenProps {
  onNavigate?: (screen: string) => void;
}

export function HistoryScreen({ onNavigate }: HistoryScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [historyList, setHistoryList] = useState<AlertHistory[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SOS' | 'SYSTEM' | 'UPDATES'>('ALL');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

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

  const getStatusBadge = (status: string) => {
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Delivered
          </Badge>
        );
      case 'Connected':
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Connected
          </Badge>
        );
      case 'Updated':
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Updated
          </Badge>
        );
      case 'Warning':
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Warning
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full bg-[#F4F8FF] px-4 py-4 overflow-y-auto no-scrollbar pb-16">
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
      </div>

      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Alert History
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          View your alert history and dispatch records.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#0B3C85]" />
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">Alert History</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {totalCount} records found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                className="bg-white border border-slate-200 text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'ALL' | 'SOS' | 'SYSTEM' | 'UPDATES')}
              >
                <option value="ALL">All Records</option>
                <option value="SOS">SOS Alerts</option>
                <option value="SYSTEM">System Updates</option>
                <option value="UPDATES">Updates</option>
              </select>
              <svg
                className="absolute right-2 top-1/2 w-4 h-4 fill-slate-400 pointer-events-none transform -translate-y-1/2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {historyList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <Bluetooth className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-black text-[#0F172A]">No history records</h3>
            <p className="text-xs text-slate-500">
              No alert history found. Trigger an SOS to see records here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyList.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0B3C85]">
                    {item.event_type === 'SOS_ALERT' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : item.event_type === 'BEACON_CONNECTED' ? (
                      <Bluetooth className="w-4 h-4" />
                    ) : item.event_type === 'LOW_BATTERY' ? (
                      <BatteryLow className="w-4 h-4 text-amber-500" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#0F172A]">
                      {item.event_type === 'SOS_ALERT' ? 'SOS Alert' : item.event_type}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>
                </div>
                {getStatusBadge(item.event_type)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return <HistoryScreen />;
}
