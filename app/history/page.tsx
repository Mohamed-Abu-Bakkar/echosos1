'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { HistoryScreen } from '@/components/screens/history-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function HistoryPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <HistoryScreen />
      <BottomNav activeTab="history" />
    </PhoneFrame>
  );
}
