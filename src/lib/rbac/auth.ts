import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { UserRole } from './permissions';
import { AuthUser, DEMO_USERS } from './user-types';

export * from './user-types';

const SESSION_COOKIE_NAME = 'instipilot_session';

/**
 * Server-side helper to retrieve current authenticated user.
 * Defaults to 'owner' if no cookie is present, ensuring instant evaluation during dev/demo.
 */
export async function getSessionUser(): Promise<AuthUser> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie) as AuthUser;
      if (parsed && parsed.role && DEMO_USERS[parsed.role]) {
        return parsed;
      }
    } catch {
      // invalid cookie json
    }
  }

  // Default demo user fallback: Owner
  return {
    id: 'u_owner',
    name: DEMO_USERS.owner.name,
    email: DEMO_USERS.owner.email,
    role: 'owner',
    avatarUrl: DEMO_USERS.owner.avatar
  };
}

/**
 * Authenticates against database or demo accounts.
 */
export function authenticateDemoUser(role: UserRole): AuthUser {
  const demo = DEMO_USERS[role];
  if (!demo) {
    throw new Error(`Invalid role: ${role}`);
  }

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, avatar_url FROM users WHERE role = ? LIMIT 1').get(role) as any;

  if (user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      avatarUrl: user.avatar_url || demo.avatar
    };
  }

  return {
    id: `u_${role}`,
    name: demo.name,
    email: demo.email,
    role: demo.role,
    avatarUrl: demo.avatar
  };
}

/**
 * Authenticates directly by user ID from database.
 */
export function authenticateUserById(userId: string): AuthUser {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, avatar_url FROM users WHERE id = ? LIMIT 1').get(userId) as any;

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const demo = DEMO_USERS[user.role as UserRole];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    avatarUrl: user.avatar_url || demo?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  };
}
