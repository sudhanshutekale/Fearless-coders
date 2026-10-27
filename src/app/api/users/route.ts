import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { UserRole } from '@/lib/rbac/permissions';
import { getSupabase, isSupabaseConfigured, upsertToSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();

    // 1. Try Supabase Cloud
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        const { data: usersData, error } = await client
          .from('users')
          .select(`
            id, name, email, role, avatar_url, created_at,
            trainers ( id, phone, specializations )
          `)
          .order('created_at', { ascending: false });

        if (!error && usersData && usersData.length > 0) {
          const formattedUsers = usersData.map((u: any) => {
            const tr = Array.isArray(u.trainers) ? u.trainers[0] : u.trainers;
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              avatar_url: u.avatar_url,
              created_at: u.created_at,
              trainer_id: tr?.id || null,
              trainer_phone: tr?.phone || null,
              trainer_specializations: tr?.specializations || null
            };
          });

          const roleCounts = {
            total: formattedUsers.length,
            owner: formattedUsers.filter((u: any) => u.role === 'owner').length,
            counselor: formattedUsers.filter((u: any) => u.role === 'counselor').length,
            trainer: formattedUsers.filter((u: any) => u.role === 'trainer').length,
            accounts: formattedUsers.filter((u: any) => u.role === 'accounts').length,
          };

          return NextResponse.json({
            currentUserRole: user.role,
            users: formattedUsers,
            roleCounts
          });
        }
      }
    }

    // 2. Fallback to SQLite
    const db = getDb();
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.avatar_url, 
        u.created_at,
        t.id as trainer_id,
        t.phone as trainer_phone,
        t.specializations as trainer_specializations
      FROM users u
      LEFT JOIN trainers t ON t.user_id = u.id
      ORDER BY 
        CASE u.role 
          WHEN 'owner' THEN 1 
          WHEN 'trainer' THEN 2 
          WHEN 'counselor' THEN 3 
          ELSE 4 
        END ASC,
        u.created_at DESC
    `).all();

    const roleCounts = {
      total: users.length,
      owner: users.filter((u: any) => u.role === 'owner').length,
      counselor: users.filter((u: any) => u.role === 'counselor').length,
      trainer: users.filter((u: any) => u.role === 'trainer').length,
      accounts: users.filter((u: any) => u.role === 'accounts').length,
    };

    return NextResponse.json({
      currentUserRole: user.role,
      users,
      roleCounts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    const body = await req.json();
    const { name, email, role, phone, specializations, avatarUrl } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required.' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['owner', 'counselor', 'trainer', 'accounts'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}. Must be owner, counselor, trainer, or accounts.` }, { status: 400 });
    }

    const defaultAvatars: Record<string, string> = {
      owner: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      counselor: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      trainer: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      accounts: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
    };

    const finalAvatar = avatarUrl && avatarUrl.trim().length > 0 
      ? avatarUrl.trim() 
      : defaultAvatars[role] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

    const userId = `u_${role}_${Date.now()}`;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    let trainerId = role === 'trainer' ? `t_${Date.now()}` : null;
    const nowIso = new Date().toISOString();

    // 1. Persist to Supabase Cloud
    if (isSupabaseConfigured()) {
      await upsertToSupabase('users', {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        password_hash: 'demo_hashed_pass_123',
        role,
        avatar_url: finalAvatar,
        created_at: nowIso
      });

      if (role === 'trainer' && trainerId) {
        await upsertToSupabase('trainers', {
          id: trainerId,
          user_id: userId,
          name: cleanName,
          email: cleanEmail,
          phone: phone || '+91 98000 00000',
          specializations: specializations || 'Core Technologies, Software Development',
          availability: JSON.stringify({
            mon: ['09:00-17:00'],
            tue: ['09:00-17:00'],
            wed: ['09:00-17:00'],
            thu: ['09:00-17:00'],
            fri: ['09:00-17:00']
          })
        });
      }

      await upsertToSupabase('audit_log', {
        id: `aud_user_${Date.now()}`,
        user_id: currentUser.id || 'u_owner',
        user_name: currentUser.name || 'Admin',
        role: currentUser.role || 'owner',
        action: 'create_user',
        query: `Created ${role.toUpperCase()} account: ${cleanName} (${cleanEmail})`,
        result_summary: `User ID: ${userId}`,
        status: 'success'
      });
    }

    // 2. Also persist to SQLite if available
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at)
        VALUES (?, ?, ?, 'demo_hashed_pass_123', ?, ?, datetime('now'))
      `).run(userId, cleanName, cleanEmail, role, finalAvatar);

      if (role === 'trainer' && trainerId) {
        db.prepare(`
          INSERT INTO trainers (id, user_id, name, email, phone, specializations, availability, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(trainerId, userId, cleanName, cleanEmail, phone || '+91 98000 00000', specializations || 'Core Technologies, Software Development', JSON.stringify({ mon: ['09:00-17:00'] }));
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, 'create_user', ?, ?, ?)
      `).run(`aud_user_${Date.now()}`, currentUser.id || 'u_owner', currentUser.name || 'Admin', currentUser.role || 'owner', `Created ${role.toUpperCase()} account: ${cleanName} (${cleanEmail})`, `User ID: ${userId}`, 'success');
    } catch (e) {
      // Ignore SQLite write error in serverless
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role,
        avatar_url: finalAvatar,
        created_at: nowIso,
        trainer_id: trainerId,
        trainer_phone: phone,
        trainer_specializations: specializations
      },
      message: `Successfully created ${role.toUpperCase()} profile for ${cleanName}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
