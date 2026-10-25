import { NextResponse } from 'next/server';
import { nearbyDevices } from '@/lib/mock-data';

export async function GET() {
  // Simulate BLE hardware scan delay
  return NextResponse.json({
    success: true,
    scannedCount: nearbyDevices.length,
    devices: nearbyDevices,
    timestamp: new Date().toISOString(),
  });
}
