import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { hashPassword, setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, phone, password } = await request.json();

    if (!name || !phone || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, phone number, and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await dbService.findUserByPhone(phone);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this phone number already exists' },
        { status: 409 }
      );
    }

    const newUser = await dbService.createUser(name, phone, hashPassword(password));
    await setSession(newUser.id, newUser.name, newUser.phone);

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}
