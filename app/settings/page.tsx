'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { SettingsScreen } from '@/components/screens/settings-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function SettingsPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <SettingsScreen />
      <BottomNav activeTab="settings" />
    </PhoneFrame>
  );
}
