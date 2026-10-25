'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { LoginScreen } from '@/components/screens/login-screen';

export default function LoginPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <LoginScreen />
    </PhoneFrame>
  );
}
