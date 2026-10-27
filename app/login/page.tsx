'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Phone,
  Lock,
  Mail,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { EchoLogo } from '@/components/ui/echo-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as api from '@/lib/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const data = await api.login(phone, password);
      if (data.success && data.user) {
        setSuccessMessage(data.message || 'Login successful');
        setTimeout(() => window.location.href = '/', 1000);
      } else {
        setErrorMessage(data.message || 'Login failed');
      }
    } catch (err) {
      setErrorMessage('Network or server error during sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSubmitting(true);
    try {
      const data = await api.register(regName, regPhone, regPassword);
      if (data.success && data.user) {
        setSuccessMessage(data.message || 'Registration successful');
        setShowRegisterDialog(false);
        setTimeout(() => window.location.href = '/', 1000);
      } else {
        setRegError(data.message || 'Registration failed');
      }
    } catch (err) {
      setRegError('Network or server error during sign up');
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen w-full bg-[#F4F8FF] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/" className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center space-x-2">
          <div className="relative shrink-0 flex items-center justify-center w-7 h-7">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8L16 23V48C16 71 31 90 50 96C69 90 84 71 84 48V23L50 8Z" fill="#0B3C85" />
              <path d="M50 14L22 27V48C22 67 34 83 50 88C66 83 78 67 78 48V27L50 14Z" fill="#0F4BA3" />
              <path d="M44 32C47.866 32 51 35.134 51 39C51 42.866 47.866 46 44 46C40.134 46 37 42.866 37 39C37 35.134 40.134 32 44 32Z" fill="white" />
              <path d="M44 48C37.5 48 32 53.5 32 60V64H56V60C56 53.5 50.5 48 44 48Z" fill="white" />
              <path d="M58 35C61.5 39.5 61.5 46.5 58 51" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M64 29C69.5 35.5 69.5 49.5 64 56" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M70 23C77.5 31.5 77.5 55 70 62" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-black tracking-tight flex items-center text-base">
              <span className="text-[#0B3C85]">Echo</span>
              <span className="text-[#E52E3D]">SOS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 py-8 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mobile Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 00000"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-[#0B3C85] hover:bg-[#082E66] text-white font-bold py-2.5 rounded-xl shadow-md shadow-[#0B3C85]/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>Sign In</>
            )}
          </Button>
          <p className="text-[11px] text-center text-slate-500 mt-3">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRegisterDialog(true)}
              className="text-[#0B3C85] font-semibold hover:underline"
            >
              Create account
            </button>
          </p>
        </form>

        <div className="mt-8">
          <button
            type="button"
            className="text-[11px] font-semibold text-slate-600 hover:underline"
            onClick={() => {
              setErrorMessage(
                'Password reset is not available yet. Contact support to recover your account.'
              );
            }}
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}
