import { cookies } from 'next/headers';
import { UserRole } from './permissions';
import { AuthUser, DEMO_USERS } from './user-types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

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
 * Authenticates against Supabase database or demo accounts.
 */
export async function authenticateDemoUser(role: UserRole): Promise<AuthUser> {
  const demo = DEMO_USERS[role];
  if (!demo) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Try Supabase for real user data
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      const { data: user } = await client
        .from('users')
        .select('id, name, email, role, avatar_url')
        .eq('role', role)
        .limit(1)
        .maybeSingle();

      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          studentId: role === 'student' ? (demo.studentId || 's_001') : undefined,
          avatarUrl: user.avatar_url || demo.avatar
        };
      }
    }
  }

  // Fallback to demo user
  return {
    id: `u_${role}`,
    name: demo.name,
    email: demo.email,
    role: demo.role,
    studentId: role === 'student' ? (demo.studentId || 's_001') : undefined,
    avatarUrl: demo.avatar
  };
}

/**
 * Authenticates directly by user ID from Supabase database.
 */
export async function authenticateUserById(userId: string): Promise<AuthUser> {
  // Try Supabase
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      const { data: user } = await client
        .from('users')
        .select('id, name, email, role, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (user) {
        const demo = DEMO_USERS[user.role as UserRole];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          studentId: user.role === 'student' ? (demo?.studentId || 's_001') : undefined,
          avatarUrl: user.avatar_url || demo?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        };
      }
    }
  }

  // Fallback: check if it matches a demo user pattern
  const roleFromId = userId.replace('u_', '') as UserRole;
  const demo = DEMO_USERS[roleFromId];
  if (demo) {
    return {
      id: userId,
      name: demo.name,
      email: demo.email,
      role: demo.role,
      studentId: roleFromId === 'student' ? (demo.studentId || 's_001') : undefined,
      avatarUrl: demo.avatar
    };
  }

  throw new Error(`User not found: ${userId}`);
}
