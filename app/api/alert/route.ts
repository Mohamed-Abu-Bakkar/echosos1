import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const alertState = await dbService.getActiveAlert();
  return NextResponse.json({
    success: true,
    alertState,
  });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    const body = await request.json().catch(() => ({}));

    const alert = await dbService.triggerAlert(
      userId,
      body.latitude,
      body.longitude
    );

    return NextResponse.json({
      success: true,
      message: 'SOS Distress Signal Dispatched!',
      alert,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to trigger SOS alert' },
      { status: 500 }
    );
  }
}
