import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'echosos_secure_super_secret_jwt_key_2026';
const AUTH_COOKIE_NAME = 'echosos_session';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SESSION_SECRET).digest('hex');
}

function createSessionToken(userId: string, name: string, phone: string): string {
  const payload = { userId, name, phone, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const { name, phone, password } = await request.json();

    if (!name || !phone || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, phone number, and password are required' },
        { status: 400 }
      );
    }

    const existingUser: any = await convexQuery('users:getUserByPhone', { phone });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this phone number already exists' },
        { status: 409 }
      );
    }

    const newUserId: string = await convexMutation('users:createUser', {
      name,
      phone,
      passwordHash: hashPassword(password),
    });
    const newUser: any = await convexQuery('users:getUserById', { userId: newUserId });

    const token = createSessionToken(newUserId, newUser.name, newUser.phone);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      user: { id: newUserId, name: newUser.name, phone: newUser.phone, created_at: newUser.created_at },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}
