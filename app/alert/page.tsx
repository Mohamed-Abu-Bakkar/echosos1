'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { AlertScreen } from '@/components/screens/alert-screen';

export default function AlertPage() {
  return (
    <PhoneFrame statusBarColor="red">
      <AlertScreen />
    </PhoneFrame>
  );
}
