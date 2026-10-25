'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { SplashScreen } from '@/components/screens/splash-screen';

export default function SplashPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <SplashScreen />
    </PhoneFrame>
  );
}
