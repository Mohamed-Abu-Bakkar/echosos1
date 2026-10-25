import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';
import { nearbyDevices } from '@/lib/mock-data';

export async function GET() {
  const session = await getSession();
  const userId = session?.userId || 1;
  const beacon = await dbService.getBeacon(userId);

  return NextResponse.json({
    success: true,
    beacon,
    nearbyDevices,
  });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    const body = await request.json();

    const deviceName = body.deviceName || 'ESP32-S3';
    const mac = body.macAddress || 'C7:3A:5B:12:4E:9F';

    const beacon = await dbService.pairBeacon(userId, deviceName, mac);

    return NextResponse.json({
      success: true,
      message: `Beacon ${deviceName} paired and registered successfully!`,
      beacon,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to pair beacon' },
      { status: 400 }
    );
  }
}
