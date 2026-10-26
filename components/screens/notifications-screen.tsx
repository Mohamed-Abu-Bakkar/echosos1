'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCircle2, 
  Settings, 
  Info, 
  BatteryLow, 
  ChevronRight, 
  ArrowLeft,
  CheckCheck,
  Loader2 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initialNotifications } from '@/lib/mock-data';
import { NotificationItem, NotificationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface NotificationsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<'ALL' | NotificationType>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async (filter: string) => {
    try {
      const url = filter === 'ALL' ? '/api/notifications' : `/api/notifications?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications(activeFilter);
  }, [activeFilter]);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const getNotificationIcon = (type: NotificationType, title: string) => {
    if (type === 'SOS') {
      return {
        icon: Bell,
        color: 'text-[#E52E3D]',
        bg: 'bg-red-50',
      };
    }
    if (title.toLowerCase().includes('battery')) {
      return {
        icon: BatteryLow,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      };
    }
    if (type === 'SYSTEM') {
      return {
        icon: Settings,
        color: 'text-[#0B3C85]',
        bg: 'bg-blue-50',
      };
    }
    return {
      icon: Info,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    };
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
          Notifications
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Stay informed on emergency triggers and hardware state changes.
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

      {/* Notifications View Cards */}
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No notifications in this category.
          </div>
        ) : (
          notifications.map((item) => {
            const { icon: Icon, color, bg } = getNotificationIcon(item.type, item.title);
            return (
              <div
                key={item.id}
                className={cn(
                  'p-3.5 rounded-2xl border transition-all flex items-start justify-between relative cursor-pointer hover:shadow-xs',
                  item.is_read
                    ? 'bg-white border-slate-100'
                    : 'bg-blue-50/50 border-blue-200/60'
                )}
              >
                {/* Unread Dot Indicator */}
                {!item.is_read && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E52E3D]" />
                )}

                <div className="flex items-start space-x-3 pr-4">
                  <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', bg, color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1.5">
                      {item.created_at}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Item: Mark all as read with backend connection */}
      <div className="pt-2 pb-3">
        <button
          onClick={markAllAsRead}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#0B3C85] text-slate-600 hover:text-[#0B3C85] text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors bg-white/70"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark all as read</span>
        </button>
      </div>
    </div>
  );
}
