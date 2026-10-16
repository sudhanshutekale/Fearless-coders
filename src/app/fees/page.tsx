'use client';

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Send, 
  DollarSign, 
  X,
  Phone,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export default function FeesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'payments'>('overdue');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<any>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    source: 'upi',
    reference: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/fees');
      if (res.status === 403) {
        setError('Access Denied: Your role does not have authorization to view financial data.');
        setLoading(false);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmi) return;
    setSavingPayment(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedEmi.student_id,
          emiId: selectedEmi.id,
          amount: parseFloat(paymentForm.amount || selectedEmi.amount),
          source: paymentForm.source,
          reference: paymentForm.reference || `UPI/VERIFY/${Date.now().toString().slice(-6)}`
        })
      });
      if (res.ok) {
        setShowPayModal(false);
        setSelectedEmi(null);
        fetchFees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPayment(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-center max-w-lg mx-auto space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="font-display text-lg font-bold text-white">Security Block (RBAC)</h3>
        <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
        <div className="pt-2">
          <span className="text-[11px] font-mono text-slate-400">
            Switch to Owner or Accounts role using the top right menu.
          </span>
        </div>
      </div>
    );
  }

  const { summary, overdueEmis, upcomingEmis, recentPayments } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
              Accounts, EMI Tracking & Collections
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Fees & Installments Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit overdue installments, impending payment windows, and record verified receipts.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Total Fee Collected</div>
          <div className="font-display text-2xl font-bold text-emerald-400">
            ₹{(summary?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Admission down payments + EMIs</div>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl">
          <div className="text-xs font-mono uppercase text-rose-300 mb-1">Total Overdue Installments</div>
          <div className="font-display text-2xl font-bold text-rose-400">
            ₹{(summary?.totalOverdue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1 font-mono">{overdueEmis?.length || 0} overdue installments</div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-xl">
          <div className="text-xs font-mono uppercase text-amber-300 mb-1">Upcoming Collections</div>
          <div className="font-display text-2xl font-bold text-amber-400">
            ₹{(summary?.totalPending || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1 font-mono">Scheduled across all active cohorts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-1.5 px-3 rounded-lg transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overdue Installments ({overdueEmis?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-1.5 px-3 rounded-lg transition-all ${
            activeTab === 'upcoming'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Due This Week / Upcoming ({upcomingEmis?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-1.5 px-3 rounded-lg transition-all ${
            activeTab === 'payments'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Verified Payments Log ({recentPayments?.length || 0})
        </button>
      </div>

      {/* Table Content */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-glass">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading ledger...</div>
        ) : activeTab === 'overdue' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Installment #</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {overdueEmis?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      {e.student_name}
                      <div className="text-[10px] text-slate-400 font-mono">{e.student_phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">{e.batch_name}</td>
                    <td className="py-3.5 px-4 text-slate-300">EMI #{e.installment_no}</td>
                    <td className="py-3.5 px-4 text-rose-400 font-bold">{e.due_date}</td>
                    <td className="py-3.5 px-4 text-white font-bold">₹{e.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedEmi(e);
                            setPaymentForm({ amount: String(e.amount), source: 'upi', reference: '' });
                            setShowPayModal(true);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-medium"
                        >
                          Record Payment
                        </button>
                        <a
                          href={`https://wa.me/${e.student_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Dear ${e.student_name}, this is a payment reminder from InstiPilot regarding your course installment of ₹${e.amount} which was due on ${e.due_date}. Please settle via UPI or contact accounts.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white"
                          title="WhatsApp Reminder"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'upcoming' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Installment #</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {upcomingEmis?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      {e.student_name}
                      <div className="text-[10px] text-slate-400 font-mono">{e.student_phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">{e.batch_name}</td>
                    <td className="py-3.5 px-4 text-slate-300">EMI #{e.installment_no}</td>
                    <td className="py-3.5 px-4 text-amber-400 font-bold">{e.due_date}</td>
                    <td className="py-3.5 px-4 text-white font-bold">₹{e.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedEmi(e);
                          setPaymentForm({ amount: String(e.amount), source: 'upi', reference: '' });
                          setShowPayModal(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-medium"
                      >
                        Receive Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentPayments?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">{p.student_name}</td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">{p.reference}</td>
                    <td className="py-3.5 px-4 text-cyan-400 uppercase text-[10px]">{p.source}</td>
                    <td className="py-3.5 px-4 text-slate-400">{p.date}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-white font-display font-bold text-base">
                Record Payment for {selectedEmi?.student_name}
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Payment Method</label>
                <select
                  value={paymentForm.source}
                  onChange={(e) => setPaymentForm({ ...paymentForm, source: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank">Bank IMPS / NEFT Transfer</option>
                  <option value="cash">Cash Receipt</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Transaction Reference / UTR *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI/YESB/48192841"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {savingPayment ? 'Verifying...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
