import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/rbac/auth';
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions';

export async function GET() {
  try {
    const user = await getSessionUser();
    const permissions = ROLE_PERMISSIONS[user.role];
    return NextResponse.json({ user, permissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
