'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F8FF]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-[#0B3C85] text-white flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8L16 23V48C16 71 31 90 50 96C69 90 84 71 84 48V23L50 8Z" fill="#0B3C85" />
              <path d="M50 14L22 27V48C22 67 34 83 50 88C66 83 78 67 78 48V27L50 14Z" fill="#0F4BA3" />
              <path d="M44 32C47.866 32 51 35.134 51 39C51 42.866 47.866 46 44 46C40.134 46 37 42.866 37 39C37 35.134 40.134 32 44 32Z" fill="white" />
              <path d="M44 48C37.5 48 32 53.5 32 60V64H56V60C56 53.5 50.5 48 44 48Z" fill="white" />
              <path d="M58 35C61.5 39.5 61.5 46.5 58 51" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M64 29C69.5 35.5 69.5 49.5 64 56" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M70 23C77.5 31.5 77.5 55 70 62" stroke="#E52E3D" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[#0B3C85]">Loading...</span>
        </div>
      </div>
    )
  }

  return null
}
