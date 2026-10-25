import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;

  const session = await getSession();
  const userId = session?.userId || 1;
  const notifications = await dbService.getNotifications(userId, type);

  return NextResponse.json({
    success: true,
    notifications,
  });
}

export async function POST() {
  const session = await getSession();
  const userId = session?.userId || 1;
  await dbService.markAllNotificationsRead(userId);

  return NextResponse.json({
    success: true,
    message: 'All notifications marked as read',
  });
}
