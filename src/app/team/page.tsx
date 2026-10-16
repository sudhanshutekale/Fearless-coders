'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCog, 
  Plus, 
  ShieldCheck, 
  Crown, 
  GraduationCap, 
  UserCheck, 
  CreditCard, 
  Mail, 
  Phone, 
  Trash2, 
  Check, 
  X, 
  Sparkles,
  AlertCircle,
  ExternalLink,
  LogIn
} from 'lucide-react';
import { UserRole } from '@/lib/rbac/permissions';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  trainer_id?: string;
  trainer_phone?: string;
  trainer_specializations?: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [roleCounts, setRoleCounts] = useState({ total: 0, owner: 0, counselor: 0, trainer: 0, accounts: 0 });
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'owner' as UserRole,
    phone: '',
    specializations: '',
    avatarUrl: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.roleCounts) setRoleCounts(data.roleCounts);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });

      const json = await res.json();

      if (res.ok) {
        setStatusMessage({ text: `Successfully created ${newMember.role.toUpperCase()} account for ${newMember.name}!`, type: 'success' });
        setShowAddModal(false);
        setNewMember({
          name: '',
          email: '',
          role: 'owner',
          phone: '',
          specializations: '',
          avatarUrl: ''
        });
        fetchUsers();
      } else {
        setStatusMessage({ text: json.error || 'Failed to create user', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleSwitchAccount = async (user: TeamMember) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        router.refresh();
        window.location.reload();
      } else {
        alert('Could not switch to this user account');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from InstiPilot?`)) return;

    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setStatusMessage({ text: `Removed account for ${name}`, type: 'success' });
        fetchUsers();
      } else {
        const json = await res.json();
        alert(json.error || 'Could not delete user');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = filterRole === 'all' 
    ? users 
    : users.filter(u => u.role === filterRole);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return {
          icon: <Crown className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Director / Owner',
          className: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
        };
      case 'trainer':
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-violet-400" />,
          label: 'Technical Trainer',
          className: 'bg-violet-950/60 text-violet-300 border-violet-500/40'
        };
      case 'counselor':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Academic Counselor',
          className: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
        };
      case 'accounts':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Accounts & Billing',
          className: 'bg-amber-950/60 text-amber-300 border-amber-500/40'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Staff, Faculty & Role Administration
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Team & Leadership Directory
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {roleCounts.total} Active Staff
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Institute Owners, Technical Trainers, Counselors, and Billing staff with automated RBAC security scopes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-neon-cyan hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Owner / Staff Member
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Total Staff</span>
            <UserCog className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-bold text-white">{roleCounts.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across all 4 RBAC tiers</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-300">Owners & Directors</span>
            <Crown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-bold text-emerald-200">{roleCounts.owner}</div>
          <div className="text-[10px] text-emerald-400 mt-1">Full operational oversight</div>
        </div>

        <div className="p-4 rounded-2xl bg-violet-950/20 border border-violet-900/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-violet-300">Technical Trainers</span>
            <GraduationCap className="w-4 h-4 text-violet-400" />
          </div>
          <div className="font-display text-2xl font-bold text-violet-200">{roleCounts.trainer}</div>
          <div className="text-[10px] text-violet-400 mt-1">Batches & attendance only</div>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-cyan-300">Counselors & Accounts</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-display text-2xl font-bold text-cyan-200">{roleCounts.counselor + roleCounts.accounts}</div>
          <div className="text-[10px] text-cyan-400 mt-1">Student success & fees</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'all', label: `All Staff (${users.length})` },
          { id: 'owner', label: `Owners (${roleCounts.owner})` },
          { id: 'trainer', label: `Trainers (${roleCounts.trainer})` },
          { id: 'counselor', label: `Counselors (${roleCounts.counselor})` },
          { id: 'accounts', label: `Accounts (${roleCounts.accounts})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterRole(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterRole === tab.id
                ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse"></div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm">
            No team members found in this category. Click &ldquo;Add Owner / Staff Member&rdquo; to add one.
          </div>
        ) : (
          filteredUsers.map((member) => {
            const roleInfo = getRoleBadge(member.role);
            return (
              <div
                key={member.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={member.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm"
                      />
                      <div>
                        <h3 className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {member.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border mt-1 ${roleInfo.className}`}>
                          {roleInfo.icon}
                          {roleInfo.label}
                        </span>
                      </div>
                    </div>

                    {member.id !== 'u_owner' && (
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-mono text-[11px] truncate">{member.email}</span>
                    </div>
                    {member.trainer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-[11px]">{member.trainer_phone}</span>
                      </div>
                    )}
                    {member.trainer_specializations && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="text-slate-400 font-medium">Domain: </span>
                        {member.trainer_specializations}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {member.id.slice(0, 14)}...
                  </span>
                  <button
                    onClick={() => handleSwitchAccount(member)}
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/40 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition-all"
                  >
                    <LogIn className="w-3 h-3 text-cyan-400" />
                    Switch to Account
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Staff Onboarding & RBAC Provisioning
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Add New Owner or Staff Member
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Provision user accounts with scoped database access, audit logging, and copilot guardrails.
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Select Operational Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'owner', label: 'Director / Owner', icon: <Crown className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Master operational & fee control' },
                    { id: 'trainer', label: 'Technical Trainer', icon: <GraduationCap className="w-3.5 h-3.5 text-violet-400" />, desc: 'Batches, labs & recordings' },
                    { id: 'counselor', label: 'Academic Counselor', icon: <UserCheck className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Attendance & dropout retention' },
                    { id: 'accounts', label: 'Accounts & Billing', icon: <CreditCard className="w-3.5 h-3.5 text-amber-400" />, desc: 'Fee structures & EMI tracking' },
                  ].map((roleChoice) => (
                    <button
                      key={roleChoice.id}
                      type="button"
                      onClick={() => setNewMember({ ...newMember, role: roleChoice.id as UserRole })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newMember.role === roleChoice.id
                          ? 'border-emerald-500 bg-emerald-950/30 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-white mb-0.5">
                        {roleChoice.icon}
                        {roleChoice.label}
                      </div>
                      <div className="text-[10px] text-slate-400">{roleChoice.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Anand Kulkarni"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. anand@instipilot.com"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 12345"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              {newMember.role === 'trainer' && (
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Trainer Technical Specializations</label>
                  <input
                    type="text"
                    placeholder="e.g. Java Fullstack, Spring Boot, AWS, Docker"
                    value={newMember.specializations}
                    onChange={(e) => setNewMember({ ...newMember, specializations: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Leave empty for auto-generated professional avatar"
                  value={newMember.avatarUrl}
                  onChange={(e) => setNewMember({ ...newMember, avatarUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                🔒 Security Note: Newly provisioned users will automatically be granted role-based table access rules and logged in the immutable audit log.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 text-white font-medium shadow-neon-cyan hover:brightness-110"
                >
                  {creating ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
