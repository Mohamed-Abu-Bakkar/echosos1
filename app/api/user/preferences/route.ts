import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const userId = session?.userId || 1;
  const preferences = await dbService.getUserPreferences(userId);

  return NextResponse.json({
    success: true,
    preferences,
  });
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    const body = await request.json();

    const updated = await dbService.updateUserPreferences(userId, body);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
