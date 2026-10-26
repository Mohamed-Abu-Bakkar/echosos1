import crypto from 'crypto';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'echosos_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'echosos_secure_super_secret_jwt_key_2026';

export interface AuthSession {
  userId: number;
  name: string;
  phone: string;
  expiresAt: number;
}

// Simple password hashing using crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SESSION_SECRET).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate simple HMAC signed token
export function createSessionToken(userId: number, name: string, phone: string): string {
  const payload = {
    userId,
    name,
    phone,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): AuthSession | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const session: AuthSession = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    );

    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSession(userId: number, name: string, phone: string): Promise<string> {
  const token = createSessionToken(userId, name, phone);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
