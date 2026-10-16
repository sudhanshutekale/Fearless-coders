import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/rbac/auth';
import { UserRole } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    const db = getDb();

    // Fetch all users with linked trainer information if applicable
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

    // Calculate role distribution metrics
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

    // Allow owners to add staff; if in another role, log as administrative action
    const isOwner = currentUser.role === 'owner';


    const body = await req.json();
    const { name, email, role, phone, specializations, avatarUrl } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required.' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['owner', 'counselor', 'trainer', 'accounts'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}. Must be owner, counselor, trainer, or accounts.` }, { status: 400 });
    }

    const db = getDb();

    // Check email uniqueness
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return NextResponse.json({ error: `A user with email ${email} already exists.` }, { status: 409 });
    }

    // Default professional avatars by role
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

    // 1. Insert into users table
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at)
      VALUES (?, ?, ?, 'demo_hashed_pass_123', ?, ?, datetime('now'))
    `).run(
      userId,
      cleanName,
      cleanEmail,
      role,
      finalAvatar
    );

    // 2. If trainer, insert linked trainer profile
    let trainerId = null;
    if (role === 'trainer') {
      trainerId = `t_${Date.now()}`;
      db.prepare(`
        INSERT INTO trainers (id, user_id, name, email, phone, specializations, availability, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        trainerId,
        userId,
        cleanName,
        cleanEmail,
        phone || '+91 98000 00000',
        specializations || 'Core Technologies, Software Development',
        JSON.stringify({
          mon: ['09:00-17:00'],
          tue: ['09:00-17:00'],
          wed: ['09:00-17:00'],
          thu: ['09:00-17:00'],
          fri: ['09:00-17:00']
        })
      );
    }

    // 3. Log into immutable audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
      VALUES (?, ?, ?, ?, 'create_user', ?, ?, ?)
    `).run(
      `aud_user_${Date.now()}`,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Created ${role.toUpperCase()} account: ${cleanName} (${cleanEmail})`,
      `User ID: ${userId}${trainerId ? `, Trainer Profile: ${trainerId}` : ''}`,
      'success'
    );

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role,
        avatar_url: finalAvatar,
        trainer_id: trainerId
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getSessionUser();

    if (currentUser.role !== 'owner') {
      return NextResponse.json({ error: 'Permission Denied: Only Owners can remove staff.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (userId === 'u_owner') {
      return NextResponse.json({ error: 'Cannot remove primary Master Owner account.' }, { status: 400 });
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) as any;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // If trainer, nullify or remove linked trainer record
    db.prepare('DELETE FROM trainers WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
      VALUES (?, ?, ?, ?, 'delete_user', ?, ?, ?)
    `).run(
      `aud_del_user_${Date.now()}`,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      `Deleted user ${targetUser.name} (${targetUser.email}, ${targetUser.role})`,
      `User ID ${userId} deleted.`,
      'success'
    );

    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
