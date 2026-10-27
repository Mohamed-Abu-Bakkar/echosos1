import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.macAddress) {
      return NextResponse.json(
        { success: false, message: 'MAC address is required' },
        { status: 400 }
      );
    }

    const result = await convexMutation('beacons:ingestHardwareTelemetry', {
      macAddress: body.macAddress,
      batteryPercent: body.batteryPercent,
      signalDbm: body.signalDbm,
      buttonPressed: Boolean(body.buttonPressed),
      latitude: body.latitude,
      longitude: body.longitude,
      eventId: typeof body.eventId === 'string' ? body.eventId : undefined,
      beaconHardwareId:
        typeof body.beaconHardwareId === 'string' ? body.beaconHardwareId : undefined,
    });

    return NextResponse.json({
      success: true,
      message: result.alertTriggered
        ? `Distress signal received from ESP32-S3 tactile button! Event ${result.eventId}. SOS dispatches initiated.`
        : 'Telemetry packet acknowledged.',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to ingest hardware packet' },
      { status: 500 }
    );
  }
}
