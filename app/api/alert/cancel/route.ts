import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));

    const result = await convexMutation('alerts:cancelAlert', {
      userId,
      eventId: typeof body.eventId === 'string' ? body.eventId : undefined,
      beaconId: typeof body.beaconId === 'string' ? body.beaconId : undefined,
      bleVerified: Boolean(body.bleVerified),
    });

    if (result && result.cancelled === false && result.reason === 'event-id-mismatch') {
      return NextResponse.json(
        {
          success: false,
          message: 'Event ID does not match the active SOS. Alert left open.',
          reason: result.reason,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SOS Alert cancelled. Contacts have been updated.',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to cancel alert' },
      { status: 500 }
    );
  }
}
