import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: true, user: null });
    const user = await convexQuery('users:getUserById', { userId });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: true, user: null });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    await convexMutation('users:updateUserProfile', {
      userId,
      name: body.name,
      phone: body.phone,
      passwordHash: body.passwordHash,
    });

    return NextResponse.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
