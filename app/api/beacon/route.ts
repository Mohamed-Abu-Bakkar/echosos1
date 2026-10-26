import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId || '1';
    const beacon = await convexQuery('beacons:getBeacon', { userId });

    return NextResponse.json({ success: true, beacon, nearbyDevices: [] });
  } catch (error) {
    return NextResponse.json({ success: true, beacon: null, nearbyDevices: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || '1';
    const body = await request.json();

    const beacon = await convexMutation('beacons:pairBeacon', {
      userId,
      deviceName: body.deviceName || 'ESP32-S3',
      macAddress: body.macAddress || 'C7:3A:5B:12:4E:9F',
    });

    return NextResponse.json({
      success: true,
      message: `Beacon ${body.deviceName || 'ESP32-S3'} paired and registered successfully!`,
      beacon,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to pair beacon' },
      { status: 400 }
    );
  }
}
