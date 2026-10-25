'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { NotificationsScreen } from '@/components/screens/notifications-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function NotificationsPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <NotificationsScreen />
      <BottomNav activeTab="history" />
    </PhoneFrame>
  );
}
