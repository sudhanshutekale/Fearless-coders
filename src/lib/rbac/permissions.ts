export type UserRole = 'owner' | 'counselor' | 'trainer' | 'accounts';

export interface RolePermissionConfig {
  role: UserRole;
  displayName: string;
  badgeColor: string;
  description: string;
  allowedTables: string[];
  forbiddenTables: string[];
  deniedColumnPatterns: string[];
  allowedActions: string[];
  navItems: { name: string; href: string; icon: string }[];
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  owner: {
    role: 'owner',
    displayName: 'Director / Owner',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30',
    description: 'Unrestricted master access to all financial, academic, operational, and audit controls.',
    allowedTables: [
      'users', 'students', 'courses', 'batches', 'trainers', 'rooms',
      'enrollments', 'fee_plans', 'emi_installments', 'payments',
      'attendance', 'assignments', 'submissions', 'recordings',
      'timetable_slots', 'messages_outbox', 'audit_log'
    ],
    forbiddenTables: [],
    deniedColumnPatterns: [],
    allowedActions: [
      'view_financials', 'reconcile_fees', 'view_attendance',
      'manage_timetable', 'replan_timetable', 'copilot_query',
      'approve_outbox', 'reject_outbox', 'view_audit_log',
      'generate_certificates', 'manage_batches', 'manage_students'
    ],
    navItems: [
      { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'Students', href: '/students', icon: 'Users' },
      { name: 'Batches', href: '/batches', icon: 'Layers' },
      { name: 'Timetable', href: '/timetable', icon: 'CalendarClock' },
      { name: 'Fees & EMIs', href: '/fees', icon: 'CreditCard' },
      { name: 'Attendance', href: '/attendance', icon: 'UserCheck' },
      { name: 'Recordings', href: '/recordings', icon: 'Video' },
      { name: 'Outbox', href: '/outbox', icon: 'Send' },
      { name: 'Reconciliation', href: '/reconciliation', icon: 'FileSpreadsheet' },
      { name: 'Team & Staff', href: '/team', icon: 'UserCog' },
      { name: 'Audit Log', href: '/audit-log', icon: 'ShieldAlert' }
    ]
  },

  counselor: {
    role: 'counselor',
    displayName: 'Academic Counselor',
    badgeColor: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/30',
    description: 'Academic tracking, student attendance, risk detection, outreach messaging. Strict zero-access to payments & banking.',
    allowedTables: [
      'students', 'courses', 'batches', 'trainers', 'rooms',
      'enrollments', 'attendance', 'assignments', 'submissions',
      'recordings', 'timetable_slots', 'messages_outbox', 'audit_log'
    ],
    forbiddenTables: ['fee_plans', 'emi_installments', 'payments'],
    deniedColumnPatterns: ['payment', 'bank', 'reference', 'down_payment'],
    allowedActions: [
      'view_attendance', 'view_students', 'view_batches',
      'copilot_query', 'approve_outbox', 'draft_outbox', 'generate_certificates'
    ],
    navItems: [
      { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'Students', href: '/students', icon: 'Users' },
      { name: 'Batches', href: '/batches', icon: 'Layers' },
      { name: 'Timetable', href: '/timetable', icon: 'CalendarClock' },
      { name: 'Attendance', href: '/attendance', icon: 'UserCheck' },
      { name: 'Recordings', href: '/recordings', icon: 'Video' },
      { name: 'Outbox', href: '/outbox', icon: 'Send' }
    ]
  },

  trainer: {
    role: 'trainer',
    displayName: 'Lead Trainer',
    badgeColor: 'border-violet-500/50 text-violet-400 bg-violet-950/30',
    description: 'Curriculum delivery, batch schedule, student attendance, assignment evaluations. Absolute block on all financial data and outbox dispatch.',
    allowedTables: [
      'batches', 'courses', 'trainers', 'rooms',
      'attendance', 'assignments', 'submissions', 'recordings',
      'timetable_slots', 'students', 'enrollments'
    ],
    forbiddenTables: ['fee_plans', 'emi_installments', 'payments', 'messages_outbox', 'audit_log'],
    deniedColumnPatterns: ['fee', 'amount', 'emi', 'payment', 'discount', 'bank'],
    allowedActions: [
      'view_assigned_batches', 'mark_attendance', 'grade_assignments',
      'view_recordings', 'copilot_query', 'view_timetable'
    ],
    navItems: [
      { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'My Batches', href: '/batches', icon: 'Layers' },
      { name: 'Timetable', href: '/timetable', icon: 'CalendarClock' },
      { name: 'Attendance', href: '/attendance', icon: 'UserCheck' },
      { name: 'Assignments', href: '/students?tab=assignments', icon: 'FileCode2' },
      { name: 'Recordings', href: '/recordings', icon: 'Video' }
    ]
  },

  accounts: {
    role: 'accounts',
    displayName: 'Accounts & Finance Manager',
    badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-950/30',
    description: 'Fee collection, EMI schedules, payment verification, UPI/bank reconciliation. No access to pedagogical material or biometric logs.',
    allowedTables: [
      'students', 'courses', 'batches', 'fee_plans',
      'emi_installments', 'payments', 'messages_outbox', 'audit_log'
    ],
    forbiddenTables: ['attendance', 'assignments', 'submissions', 'recordings', 'timetable_slots'],
    deniedColumnPatterns: ['biometric', 'check_in_time', 'ip_or_location', 'submission_url', 'recording_url'],
    allowedActions: [
      'view_financials', 'reconcile_fees', 'view_students',
      'copilot_query', 'approve_outbox', 'export_financials'
    ],
    navItems: [
      { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'Fees & EMIs', href: '/fees', icon: 'CreditCard' },
      { name: 'Reconciliation', href: '/reconciliation', icon: 'FileSpreadsheet' },
      { name: 'Students', href: '/students', icon: 'Users' },
      { name: 'Batches', href: '/batches', icon: 'Layers' },
      { name: 'Outbox', href: '/outbox', icon: 'Send' }
    ]
  }
};

/**
 * Checks whether a given role can query a specific table.
 */
export function isTableAllowed(role: UserRole, tableName: string): boolean {
  const normalized = tableName.toLowerCase().trim();
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;

  // Strict check: Must be in allowedTables AND not in forbiddenTables
  const isAllowed = config.allowedTables.map(t => t.toLowerCase()).includes(normalized);
  const isForbidden = config.forbiddenTables.map(t => t.toLowerCase()).includes(normalized);

  return isAllowed && !isForbidden;
}

/**
 * Checks if a column name or fragment is forbidden for this role.
 */
export function isColumnForbidden(role: UserRole, columnName: string): boolean {
  const normalized = columnName.toLowerCase().trim();
  const config = ROLE_PERMISSIONS[role];
  if (!config) return true;

  return config.deniedColumnPatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Checks if a specific action is authorized for this role.
 */
export function hasPermission(role: UserRole, action: string): boolean {
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.allowedActions.includes(action);
}
