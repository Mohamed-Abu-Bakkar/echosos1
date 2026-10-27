import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: true, notifications: [] });
    const notifications = await convexQuery('notifications:getNotifications', { userId, type });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    return NextResponse.json({ success: true, notifications: [] });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    await convexMutation('notifications:markAllNotificationsRead', { userId });

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
