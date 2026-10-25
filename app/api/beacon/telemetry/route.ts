import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';

// Webhook endpoint for ESP32-S3 BLE Hardware Beacon packets
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.macAddress) {
      return NextResponse.json(
        { success: false, message: 'MAC address is required' },
        { status: 400 }
      );
    }

    const result = await dbService.ingestHardwareTelemetry({
      macAddress: body.macAddress,
      batteryPercent: body.batteryPercent,
      signalDbm: body.signalDbm,
      buttonPressed: Boolean(body.buttonPressed),
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return NextResponse.json({
      success: true,
      message: result.alertTriggered
        ? 'Distress signal received from ESP32-S3 tactile button! SOS dispatches initiated.'
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
