import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();
  } catch (error) {
    // Continue client logout even on network error
  }
  return NextResponse.json({ success: true, message: 'Logged out' });
}
