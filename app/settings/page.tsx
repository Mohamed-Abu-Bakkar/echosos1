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
  AlertCircle,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/lib/api';

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
}

export function SettingsScreen({ onNavigate, onLogout }: SettingsScreenProps) {
  const router = useRouter();
  const { user, logout, refreshUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPreferences()
      .then((data) => {
        if (data.success && data.preferences) {
          setDarkMode(Boolean(data.preferences.dark_mode));
        }
      })
      .catch(() => {});
  }, []);

  const handleDarkModeToggle = async (checked: boolean) => {
    setDarkMode(checked);
    try {
      await api.updatePreferences({ darkMode: checked });
    } catch (err) {
      console.error('Failed to save dark mode:', err);
    }
  };

  const handleOpenAccountDialog = () => {
    setProfileName(user?.name || '');
    setProfilePhone(user?.phone || '');
    setProfilePassword('');
    setProfileSuccess(null);
    setShowAccountDialog(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);

    try {
      const payload: { name: string; phone: string; passwordHash?: string } = {
        name: profileName,
        phone: profilePhone,
      };
      if (profilePassword) {
        const { hashPassword } = await import('@/lib/session');
        payload.passwordHash = await hashPassword(profilePassword);
      }

      const data = await api.updateProfile(payload);
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
        logout();
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
        .split('')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const settingsList = [
    {
      id: 'profile',
      title: 'Account Settings',
      subtitle: 'Name, phone, and profile preferences',
      icon: User,
      iconColor: 'text-[#0B3C85]',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-100',
      action: () => setShowAccountDialog(true),
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      subtitle: 'Language, theme and display settings',
      icon: Sliders,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-100',
      action: () => setShowAccountDialog(true),
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
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-[#0B3C85] text-white text-[10px] font-bold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div>
        <h1 className="text-xl font-black text-[#0B3C85] tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Manage your app preferences and device settings.
        </p>
      </div>

      <div className="space-y-2.5">
        {settingsList.map((item) => (
          <div
            key={item.id}
            onClick={item.action}
            className={`p-3.5 rounded-2xl ${item.bgColor} border ${item.borderColor} flex items-center justify-between cursor-pointer hover:shadow-xs transition-all`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl bg-white shadow-xs ${item.iconColor}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">{item.title}</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {item.subtitle}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        ))}

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white shadow-xs text-purple-600">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">Dark Mode</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Reduce eye strain
              </p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
        </div>

        <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white shadow-xs text-cyan-600">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">About EchoSOS</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Emergency safety with ESP32 BLE beacons
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <Button
          type="button"
          variant="destructive"
          className="w-full bg-white border border-slate-200 text-red-500 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl shadow-md shadow-[#0B3C85]/20"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </>
          )}
        </Button>
      </div>

      {showAccountDialog && (
        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update your account information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Name
                  </label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="New password (optional)"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
            {profileSuccess && (
              <p className="text-[11px] text-center text-emerald-600 font-semibold mt-2">
                {profileSuccess}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsScreen />;
}
