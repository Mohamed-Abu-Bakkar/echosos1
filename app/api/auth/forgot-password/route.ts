import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const user = await convexQuery('users:getUserByPhone', { phone });

    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      await convexMutation('notifications:markAllNotificationsRead', { userId: user._id });
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${phone}. (Demo code: ${tempCode})`,
      tempCode,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset' },
      { status: 500 }
    );
  }
}
