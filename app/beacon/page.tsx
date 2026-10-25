'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { BeaconScreen } from '@/components/screens/beacon-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function BeaconPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <BeaconScreen />
      <BottomNav activeTab="beacon" />
    </PhoneFrame>
  );
}
