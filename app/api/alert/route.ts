import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const alertState = await convexQuery('alerts:getActiveAlert', {});
    return NextResponse.json({ success: true, alertState });
  } catch (error) {
    return NextResponse.json({ success: true, alertState: null });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));

    const result = await convexMutation('alerts:triggerAlert', {
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
      beaconId: typeof body.beaconId === 'string' ? body.beaconId : undefined,
      eventId: typeof body.eventId === 'string' ? body.eventId : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'SOS Distress Signal Dispatched!',
      alert: {
        id: result.historyId,
        eventId: result.eventId,
        beaconId: result.beaconId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to trigger alert' },
      { status: 500 }
    );
  }
}
