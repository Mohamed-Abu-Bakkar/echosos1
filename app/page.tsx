'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { HomeScreen } from '@/components/screens/home-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function HomePage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <HomeScreen />
      <BottomNav activeTab="home" />
    </PhoneFrame>
  );
}
