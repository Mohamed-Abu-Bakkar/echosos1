import { NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user: any = await convexQuery('users:getUserById', { userId: session.userId });

    return NextResponse.json({
      authenticated: true,
      user: user || { id: session.userId, name: session.name, phone: session.phone },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
