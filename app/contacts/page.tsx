'use client';

import React from 'react';
import { PhoneFrame } from '@/components/ui/phone-frame';
import { ContactsScreen } from '@/components/screens/contacts-screen';
import { BottomNav } from '@/components/ui/bottom-nav';

export default function ContactsPage() {
  return (
    <PhoneFrame statusBarColor="dark">
      <ContactsScreen />
      <BottomNav activeTab="contacts" />
    </PhoneFrame>
  );
}
