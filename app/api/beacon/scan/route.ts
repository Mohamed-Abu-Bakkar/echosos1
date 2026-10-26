import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    scannedCount: 3,
    devices: [
      { name: 'EchoSOS-001', mac: 'C7:3A:5B:12:4E:9F', signal: '-45 dBm', available: true },
      { name: 'EchoSOS-002', mac: 'B2:4C:19:98:3A:D1', signal: '-67 dBm', available: false },
      { name: 'ESP32-Device', mac: 'FA:81:04:77:E5:22', signal: '-78 dBm', available: false },
    ],
    timestamp: new Date().toISOString(),
  });
}
