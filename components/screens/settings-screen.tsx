'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Sliders, 
  Radio, 
  MapPin, 
  Bell, 
  Moon, 
  Info, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
}

export function SettingsScreen({ onNavigate, onLogout }: SettingsScreenProps) {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Edit Profile Dialog
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Load preferences from backend
  useEffect(() => {
    fetch('/api/user/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.preferences) {
          setDarkMode(Boolean(data.preferences.darkMode));
        }
      })
      .catch(() => {});
  }, []);

  const handleDarkModeToggle = async (checked: boolean) => {
    setDarkMode(checked);
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkMode: checked }),
      });
    } catch (err) {
      console.error('Failed to save dark mode:', err);
    }
  };

  const handleOpenAccountDialog = () => {
    setProfileName(user?.name || 'Nithish');
    setProfilePhone(user?.phone || '+91 98765 43210');
    setProfilePassword('');
    setProfileSuccess(null);
    setShowAccountDialog(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);

    try {
      const payload: any = { name: profileName, phone: profilePhone };
      if (profilePassword) payload.password = profilePassword;

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProfileSuccess('Profile updated successfully!');
        await refreshUser();
        setTimeout(() => setShowAccountDialog(false), 1200);
      }
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out from EchoSOS?')) {
      setIsLoggingOut(true);
      try {
        await logout();
        if (onLogout) {
          onLogout();
        } else if (onNavigate) {
          onNavigate('login');
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setIsLoggingOut(false);
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

  const settingsList = [
    {
      id: 'account',
      title: 'Account',
      subtitle: user ? `${user.name} • ${user.phone}` : 'View and manage your profile',
      icon: User,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-100',
      action: handleOpenAccountDialog,
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      subtitle: 'Language, theme and display settings',
      icon: Sliders,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-100',
      action: () => alert('Language: English (US) • Audio Alerts: Enabled'),
    },
    {
      id: 'beacon',
      title: 'Beacon Settings',
      subtitle: 'Manage your paired beacon',
      icon: Radio,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-100',
      action: () => onNavigate ? onNavigate('beacon') : router.push('/beacon'),
    },
    {
      id: 'privacy',
      title: 'Location & Privacy',
      subtitle: 'Manage location permissions and privacy',
      icon: MapPin,
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50/70',
      borderColor: 'border-rose-100',
      action: () => alert('High-Precision GPS & BLE Background telemetry active.'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Customize alert and system notifications',
      icon: Bell,
      iconColor: 'text-[#0B3C85]',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-100',
      action: () => onNavigate ? onNavigate('notifications') : router.push('/notifications'),
    },
  ];

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
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Manage your app preferences and device settings.
        </p>
      </div>

      {/* List Cards (Pastel Background Tints) */}
      <div className="space-y-2.5">
        {settingsList.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.action}
              className={`p-3.5 rounded-2xl ${item.bgColor} border ${item.borderColor} flex items-center justify-between cursor-pointer hover:shadow-xs transition-all`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl bg-white shadow-xs ${item.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          );
        })}

        {/* 6. Dark Mode (Purple Moon Icon | Switch Toggle) */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white shadow-xs text-purple-600">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">
                Dark Mode
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Reduce eye strain
              </p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
        </div>

        {/* 7. About EchoSOS (Cyan Info Icon | Version 1.0.0 | >) */}
        <div
          onClick={() => alert('EchoSOS v1.0.0 (Build 2026.1). Connected to ESP32 Hardware Mesh.')}
          className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white shadow-xs text-cyan-600">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">
                About EchoSOS
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Version 1.0.0
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Logout Action: Full-width Light Red Tinted Button with Real Logout Logic */}
      <div className="pt-2 pb-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full p-3.5 rounded-2xl bg-red-50 hover:bg-red-100/80 border border-red-200/60 flex items-center justify-center space-x-2 text-[#E52E3D] font-bold text-xs transition-colors shadow-2xs disabled:opacity-50"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </>
          )}
        </button>
      </div>

      {/* Edit Profile Dialog Modal */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#0B3C85]">
              Account Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update your safety network display name & phone number.
            </DialogDescription>
          </DialogHeader>

          {profileSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">Name</label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">Phone Number</label>
              <Input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">New Password (Optional)</label>
              <Input
                type="password"
                placeholder="Leave blank to keep current"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
