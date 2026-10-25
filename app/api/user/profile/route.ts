import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = await dbService.findUserById(session.userId);
  return NextResponse.json({
    success: true,
    user,
  });
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    const body = await request.json();

    const updateData: { name?: string; phone?: string; passwordHash?: string } = {};
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.password) updateData.passwordHash = hashPassword(body.password);

    const updatedUser = await dbService.updateUserProfile(userId, updateData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
