import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex-server';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'echosos_secure_super_secret_jwt_key_2026';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SESSION_SECRET).digest('hex');
}

export async function POST() {
  try {
    const passwordHash = hashPassword('password123');

    const userId: string = await convexMutation('users:seedDefaultData', {
      name: 'Nithish',
      phone: '+91 98765 43210',
      passwordHash,
    });

    return NextResponse.json({
      success: true,
      message: 'Default data seeded successfully',
      userId,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed data' },
      { status: 500 }
    );
  }
}
