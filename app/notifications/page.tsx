'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCircle2,
  Settings,
  Info,
  BatteryLow,
  ChevronRight,
  ArrowLeft,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationItem, NotificationType } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

interface NotificationsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | NotificationType>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const fetchNotifications = async (filter: string) => {
    setIsLoading(true);
    try {
      const data = await api.getNotifications(filter === 'ALL' ? undefined : filter);
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(activeFilter);
  }, [activeFilter]);

  const markAllAsRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const getNotificationIcon = (type: NotificationType, title: string) => {
    if (type === 'SOS') {
      return { icon: Bell, color: 'text-[#E52E3D]', bg: 'bg-red-50' };
    }
    if (title.toLowerCase().includes('battery')) {
      return { icon: BatteryLow, color: 'text-amber-600', bg: 'bg-amber-50' };
    }
    if (type === 'SYSTEM') {
      return { icon: Settings, color: 'text-[#0B3C85]', bg: 'bg-blue-50' };
    }
    return { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' };
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen w-full bg-[#F4F8FF] px-4 py-4 overflow-y-auto no-scrollbar pb-16">
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
          Notifications
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          View your notifications and alert history.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#0B3C85]" />
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">Notifications</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {notifications.length} notifications
              </p>
            </div>
          </div>
          {notifications.length > 0 && (
            <Button size="sm" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-black text-[#0F172A]">No notifications</h3>
            <p className="text-xs text-slate-500">
              No notifications found. Alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((item) => {
              const { icon: Icon, color, bg } = getNotificationIcon(item.type, item.title);
              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A]">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{item.message}</p>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>
                  </div>
                  {!item.is_read && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold block mt-0.5 w-fit">
                      New
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
