/**
 * Local session storage for the Capacitor / static-export app.
 * Replaces the Next httpOnly cookie session (no server in the native shell).
 */

const SESSION_KEY = 'echosos_session';
const SESSION_SECRET = 'echosos_secure_super_secret_jwt_key_2026';

export interface StoredSession {
  userId: string;
  name: string;
  phone: string;
  expiresAt: number;
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SESSION_SECRET);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (!session.userId || session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(
  userId: string,
  name: string,
  phone: string
): StoredSession {
  const session: StoredSession = {
    userId,
    name,
    phone,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}
