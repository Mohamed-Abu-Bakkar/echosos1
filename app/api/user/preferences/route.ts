import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: true, preferences: null });
    const preferences = await convexQuery('preferences:getPreferences', { userId });

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    return NextResponse.json({ success: true, preferences: null });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    await convexMutation('preferences:updatePreferences', {
      userId,
      darkMode: body.darkMode,
      language: body.language,
      notificationsEnabled: body.notificationsEnabled,
      sosSensitivity: body.sosSensitivity,
    });

    return NextResponse.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
