import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const convex = null;
    const alertState = await convexQuery('alerts:getActiveAlert', {});
    return NextResponse.json({ success: true, alertState });
  } catch (error) {
    return NextResponse.json({ success: true, alertState: null });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || '1';
    const body = await request.json().catch(() => ({}));

    const alertId = await convexMutation('alerts:triggerAlert', {
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return NextResponse.json({
      success: true,
      message: 'SOS Distress Signal Dispatched!',
      alert: { id: alertId },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to trigger SOS alert' },
      { status: 500 }
    );
  }
}
