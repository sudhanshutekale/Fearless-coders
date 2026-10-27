import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

let _supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseKey || !supabaseUrl) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket as any },
    });
  }
  return _supabaseClient;
}

export const isSupabaseConfigured = (): boolean => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(supabaseUrl && supabaseKey);
};

export async function upsertToSupabase(table: string, data: any | any[]) {
  const client = getSupabase();
  if (!client) return { error: 'Supabase client not configured' };
  try {
    const payload = Array.isArray(data) ? data : [data];
    const { data: result, error } = await client.from(table).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase Upsert Warning] on table ${table}:`, error.message);
      return { error };
    }
    return { data: result };
  } catch (err: any) {
    console.warn(`[Supabase Upsert Exception] on table ${table}:`, err.message);
    return { error: err.message };
  }
}

export async function deleteFromSupabase(table: string, matchCol: string, matchVal: any) {
  const client = getSupabase();
  if (!client) return { error: 'Supabase client not configured' };
  try {
    const { error } = await client.from(table).delete().eq(matchCol, matchVal);
    if (error) {
      console.warn(`[Supabase Delete Warning] on table ${table}:`, error.message);
      return { error };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[Supabase Delete Exception] on table ${table}:`, err.message);
    return { error: err.message };
  }
}

/**
 * Fetch students from Supabase with joins matching frontend expectations
 */
export async function fetchStudentsFromSupabase(opts: {
  search?: string;
  batchId?: string;
  status?: string;
  studentIdOnly?: string;
  role?: string;
}) {
  const client = getSupabase();
  if (!client) return null;

  try {
    let query = client
      .from('students')
      .select(`
        id, name, email, phone, guardian_name, guardian_phone, city, college, join_date, status,
        enrollments (
          batch_id,
          batches (
            id, name,
            courses (
              id, name
            )
          )
        ),
        attendance (
          id, status
        ),
        emi_installments (
          id, status, amount, due_date
        )
      `)
      .order('join_date', { ascending: false });

    if (opts.search) {
      query = query.or(`name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%,city.ilike.%${opts.search}%`);
    }

    if (opts.status) {
      query = query.eq('status', opts.status);
    }

    if (opts.studentIdOnly) {
      query = query.eq('id', opts.studentIdOnly);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn('Error querying students from Supabase:', error);
      return null;
    }

    // Transform into standard flat format expected by frontend
    const students = data
      .filter((st: any) => {
        if (!opts.batchId) return true;
        const bId = st.enrollments?.[0]?.batch_id;
        return bId === opts.batchId;
      })
      .map((st: any) => {
        const enr = st.enrollments?.[0];
        const batch = enr?.batches;
        const course = batch?.courses;

        const attList = st.attendance || [];
        const totalAtt = attList.length;
        const presentAtt = attList.filter((a: any) => a.status === 'present').length;
        const absentAtt = attList.filter((a: any) => a.status === 'absent').length;

        const emiList = st.emi_installments || [];
        const overdueEmis = emiList.filter((e: any) => e.status === 'overdue');
        const overdueCount = overdueEmis.length;
        const overdueAmount = overdueEmis.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

        const pendingEmis = emiList
          .filter((e: any) => e.status === 'pending' && e.due_date)
          .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        const nextEmiDate = pendingEmis[0]?.due_date || null;

        return {
          id: st.id,
          name: st.name,
          email: st.email,
          phone: st.phone,
          guardian_name: st.guardian_name,
          guardian_phone: st.guardian_phone,
          city: st.city,
          college: st.college,
          join_date: st.join_date,
          status: st.status,
          batch_id: batch?.id || null,
          batch_name: batch?.name || 'Unassigned',
          course_name: course?.name || null,
          total_attendance_sessions: totalAtt,
          present_sessions: presentAtt,
          absent_sessions: absentAtt,
          overdue_emi_count: opts.role !== 'trainer' ? overdueCount : 0,
          overdue_emi_amount: opts.role !== 'trainer' ? overdueAmount : 0,
          next_emi_date: opts.role !== 'trainer' ? nextEmiDate : null
        };
      });

    return students;
  } catch (err: any) {
    console.warn('Exception in fetchStudentsFromSupabase:', err.message);
    return null;
  }
}

/**
 * Fetch batches from Supabase with joins matching frontend expectations
 */
export async function fetchBatchesFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('batches')
      .select(`
        *,
        courses ( id, name, code ),
        trainers ( id, name ),
        rooms ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map((b: any) => ({
      id: b.id,
      course_id: b.course_id,
      trainer_id: b.trainer_id,
      room_id: b.room_id,
      name: b.name,
      days: b.days,
      start_time: b.start_time,
      end_time: b.end_time,
      mode: b.mode,
      online_seat_limit: b.online_seat_limit,
      max_seats: b.max_seats,
      status: b.status,
      start_date: b.start_date,
      end_date: b.end_date,
      course_name: b.courses?.name || '',
      course_code: b.courses?.code || '',
      trainer_name: b.trainers?.name || '',
      room_name: b.rooms?.name || null,
      enrolled_count: 0
    }));
  } catch (err: any) {
    console.warn('Exception in fetchBatchesFromSupabase:', err.message);
    return null;
  }
}
