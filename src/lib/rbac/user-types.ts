import { UserRole } from './permissions';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export const DEMO_USERS: Record<UserRole, { email: string; name: string; title: string; role: UserRole; avatar: string; description: string }> = {
  owner: {
    email: 'owner@instipilot.com',
    name: 'Priya Sharma',
    title: 'Managing Director & Institute Owner',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Master Admin — Full oversight of all operations, fees, teachers, rooms, and AI copilot actions.'
  },
  counselor: {
    email: 'counselor@instipilot.com',
    name: 'Rajesh Rao',
    title: 'Senior Academic Counselor & Retention Lead',
    role: 'counselor',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'Student Success — Attendance monitoring, dropout risk intervention, WhatsApp outreach.'
  },
  trainer: {
    email: 'trainer@instipilot.com',
    name: 'Vikram Malhotra',
    title: 'Principal Technical Trainer',
    role: 'trainer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Curriculum & Batches — Manages assigned batches, attendance & recordings. No fee access.'
  },
  accounts: {
    email: 'accounts@instipilot.com',
    name: 'Neha Joshi',
    title: 'Head of Accounts & Collections',
    role: 'accounts',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    description: 'Finance & Compliance — Fee structures, EMI tracking, bank reconciliation, receipts.'
  }
};
