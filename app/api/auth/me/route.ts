import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { dbService } from '@/lib/db/service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const user = await dbService.findUserById(session.userId);

    return NextResponse.json({
      authenticated: true,
      user: user || {
        id: session.userId,
        name: session.name,
        phone: session.phone,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
