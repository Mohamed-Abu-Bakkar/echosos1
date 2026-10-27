import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    await convexMutation('alerts:cancelAlert', { userId });

    return NextResponse.json({
      success: true,
      message: 'SOS Alert cancelled. Contacts have been updated.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to cancel alert' },
      { status: 500 }
    );
  }
}
