import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    await dbService.cancelAlert(userId);

    return NextResponse.json({
      success: true,
      message: 'SOS Alert cancelled. Contacts have been updated.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to cancel alert' },
      { status: 500 }
    );
  }
}
