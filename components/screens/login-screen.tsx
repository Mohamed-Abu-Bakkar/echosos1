'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  MapPin, 
  ChevronRight, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  X,
  User
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LoginScreenProps {
  onNavigate?: (screen: string) => void;
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { login, register } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('+91 98765 43210');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Register Dialog State
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(phone, password);
      if (result.success) {
        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          } else {
            router.push('/');
          }
        }, 500);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSubmitting(true);

    try {
      const result = await register(regName, regPhone, regPassword);
      if (result.success) {
        setShowRegisterDialog(false);
        setSuccessMessage(`Welcome, ${regName}! Logged in successfully.`);
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('home');
          } else {
            router.push('/');
          }
        }, 500);
      } else {
        setRegError(result.message);
      }
    } catch (err) {
      setRegError('Failed to register account.');
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen flex-1 w-full bg-[#F4F8FF] px-6 py-6 overflow-y-auto no-scrollbar">
      {/* Header: Compact EchoSOS Logo & Tagline */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <EchoLogo size="sm" inline={true} />
        <span className="text-[11px] font-semibold text-slate-400 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/60">
          v1.0.0
        </span>
      </div>

      {/* Title Block */}
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-black tracking-tight text-[#0B3C85]">
          Welcome Back
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Sign in to stay connected with your safety network.
        </p>
      </div>

      {/* Feedback Alert Banners */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#E52E3D] flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0F172A] tracking-wide">
            Mobile Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-[#0B3C85]" />
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile Number"
              className="pl-10 text-sm bg-white border-slate-200 shadow-xs focus-visible:border-[#0B3C85]"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0F172A] tracking-wide">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4 text-[#0B3C85]" />
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="pl-10 pr-10 text-sm bg-white border-slate-200 shadow-xs focus-visible:border-[#0B3C85]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Options Row: Checkbox Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#0B3C85] focus:ring-[#0B3C85] rounded-xs"
            />
            <span className="text-slate-600 font-medium">Remember me</span>
          </label>
          <button
            type="button"
            className="text-[#0B3C85] font-semibold hover:underline"
            onClick={() => alert('Demo account: Mobile: +91 98765 43210, Password: password123')}
          >
            Forgot Password?
          </button>
        </div>

        {/* Actions: Primary Solid Navy Button */}
        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white flex items-center justify-center gap-2 font-bold shadow-md shadow-[#0B3C85]/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Divider: OR */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-[#F4F8FF] px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              OR
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Outlined Secondary Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowRegisterDialog(true)}
            className="w-full border-2 border-[#0B3C85] text-[#0B3C85] bg-white hover:bg-slate-50 flex items-center justify-center gap-2 font-bold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Account</span>
          </Button>
        </div>
      </form>

      {/* Permission Card at Bottom */}
      <div className="mt-auto pt-6 pb-2">
        <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-[#0B3C85] text-white mt-0.5 shrink-0 shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0B3C85] leading-snug">
                Location & Bluetooth Permission
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                Required to detect your SOS beacon and find your location.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#0B3C85] shrink-0 ml-1" />
        </div>
      </div>

      {/* Create New Account Modal / Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#0B3C85]">
              Create EchoSOS Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register your phone number to pair with your ESP32-S3 beacon.
            </DialogDescription>
          </DialogHeader>

          {regError && (
            <div className="p-2.5 rounded-xl bg-red-50 text-[#E52E3D] text-xs font-semibold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">Full Name</label>
              <Input
                placeholder="e.g. Nithish Kumar"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">Mobile Number</label>
              <Input
                placeholder="+91 98765 00000"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A]">Password</label>
              <Input
                type="password"
                placeholder="Choose a strong password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={regSubmitting}
                className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold"
              >
                {regSubmitting ? 'Creating Account...' : 'Register & Log In'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
