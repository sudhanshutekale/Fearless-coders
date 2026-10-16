'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Send, CheckCircle, XCircle, Phone, X, Filter } from 'lucide-react';

export default function OutboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/outbox/approve');
      if (res.status === 403) { setLoading(false); return; }
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleApprove = async (msg: any) => {
    setApprovingId(msg.id);
    try {
      const res = await fetch('/api/outbox/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: msg.id,
          studentId: msg.student_id,
          recipientPhone: msg.recipient_phone,
          recipientName: msg.recipient_name,
          messageText: msg.message_text,
          draftReason: msg.draft_reason,
          channel: msg.channel
        })
      });
      if (res.ok) {
        const cleanPhone = msg.recipient_phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg.message_text)}`, '_blank');
        fetchMessages();
      }
    } catch (e) { console.error(e); }
    finally { setApprovingId(null); }
  };

  const filtered = filterStatus ? messages.filter(m => m.status === filterStatus) : messages;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
          Human-in-the-Loop Approval Queue
        </span>
        <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Messages Outbox
          <span className="ml-2 text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
            {messages.filter(m => m.status === 'draft').length} Awaiting Approval
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          All AI-drafted and manual messages require human approval before dispatch. No message is sent automatically.
        </p>
      </div>

      <div className="flex gap-2 text-xs font-mono">
        {['', 'draft', 'approved', 'sent', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`py-1.5 px-3 rounded-lg border transition-all ${
              filterStatus === s
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                : 'text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'draft' && ` (${messages.filter(m => m.status === 'draft').length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading outbox...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No messages in this queue.</div>
        ) : (
          filtered.map((msg: any) => (
            <div
              key={msg.id}
              className={`p-5 rounded-2xl border backdrop-blur-xl ${
                msg.status === 'draft'
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : msg.status === 'approved'
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-white">{msg.recipient_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{msg.recipient_phone}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                      msg.status === 'draft'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : msg.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {msg.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 italic">{msg.draft_reason}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                  via {msg.channel?.toUpperCase()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap mb-3">
                {msg.message_text}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Created by: {msg.created_by_role} &bull; {msg.created_at?.slice(0, 16)}</span>
                {msg.status === 'draft' && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${msg.recipient_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg.message_text)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleApprove(msg)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve & Send via WhatsApp
                    </a>
                  </div>
                )}
                {msg.status === 'approved' && msg.approved_by && (
                  <span className="text-emerald-400">Approved by {msg.approved_by}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
