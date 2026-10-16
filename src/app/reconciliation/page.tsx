'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

interface MatchedRecord {
  reference: string;
  amount: number;
  date: string;
  matchedStudentName?: string;
  matchedStudentId?: string;
  matchedEmiId?: string;
  confidence: number; // 0-100
  status: 'matched' | 'unmatched' | 'suspicious';
  reason: string;
}

export default function ReconciliationPage() {
  const [csvData, setCsvData] = useState<MatchedRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [approving, setApproving] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setProcessing(true);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));

      const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('utr') || h.includes('txn'));
      const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('amt'));
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('sender'));

      const parsedRows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/['"]/g, ''));
        return {
          reference: cols[refIdx >= 0 ? refIdx : 0] || `TXN${Math.random().toString(36).slice(2)}`,
          amount: parseFloat(cols[amtIdx >= 0 ? amtIdx : 1]) || 0,
          date: cols[dateIdx >= 0 ? dateIdx : 2] || '2026-10-15',
          senderName: cols[nameIdx >= 0 ? nameIdx : 3] || ''
        };
      }).filter(r => r.amount > 0);

      // Send to server for matching
      const res = await fetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: parsedRows })
      });

      if (res.ok) {
        const result = await res.json();
        setCsvData(result.matches || []);
      }
    } catch (err) {
      console.error('CSV processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (record: MatchedRecord) => {
    if (!record.matchedEmiId || !record.matchedStudentId) return;
    setApproving(record.reference);
    try {
      await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.matchedStudentId,
          emiId: record.matchedEmiId,
          amount: record.amount,
          source: 'bank',
          reference: record.reference,
          notes: 'Auto-matched via CSV reconciliation'
        })
      });
      setCsvData(prev => prev.map(r =>
        r.reference === record.reference ? { ...r, status: 'matched' as const } : r
      ));
    } catch (e) { console.error(e); }
    finally { setApproving(null); }
  };

  const matched = csvData.filter(r => r.status === 'matched');
  const unmatched = csvData.filter(r => r.status === 'unmatched');
  const suspicious = csvData.filter(r => r.status === 'suspicious');

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
          UPI / Bank Statement Auto-Matcher
        </span>
        <h2 className="font-display text-2xl font-bold text-white tracking-tight">
          Fee Reconciliation Engine
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload a bank/UPI statement CSV. InstiPilot will auto-match transactions to expected EMIs using amount, reference, and fuzzy name matching.
        </p>
      </div>

      {/* Upload Zone */}
      <label className="cursor-pointer block">
        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 hover:border-cyan-500/60 transition-colors flex flex-col items-center gap-3 text-center">
          {processing ? (
            <div className="flex items-center gap-3 text-cyan-300">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Parsing CSV and running fuzzy match engine...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-sm text-slate-300">
                {fileName ? `Uploaded: ${fileName}` : 'Drop your bank/UPI CSV statement here or click to browse'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Expected columns: Reference/UTR, Amount, Date, Sender Name
              </div>
              <div className="py-1.5 px-4 rounded-xl bg-cyan-600/80 text-white text-xs font-medium">
                Select CSV File
              </div>
            </>
          )}
        </div>
        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
      </label>

      {/* Demo Data button */}
      <button
        onClick={() => {
          const demoCsv = `Reference,Amount,Date,Sender Name\nUPI/HDFC/841928,11667,2026-10-14,Rohan G\nUPI/YESB/291847,11667,2026-10-15,Ananya D\nUPI/SBI/UNKN99,5000,2026-10-15,Unknown Sender\nNEFT/ICIC/00293,23334,2026-10-13,Amit P\nUPI/GPY/827364,11250,2026-10-16,Kavita N`;
          const blob = new Blob([demoCsv], { type: 'text/csv' });
          const file = new File([blob], 'demo_statement.csv', { type: 'text/csv' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (input) {
            Object.defineProperty(input, 'files', { value: dt.files, writable: false });
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          setFileName('demo_statement.csv');
          setProcessing(true);
          fetch('/api/reconciliation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: [
                { reference: 'UPI/HDFC/841928', amount: 11667, date: '2026-10-14', senderName: 'Rohan G' },
                { reference: 'UPI/YESB/291847', amount: 11667, date: '2026-10-15', senderName: 'Ananya D' },
                { reference: 'UPI/SBI/UNKN99', amount: 5000, date: '2026-10-15', senderName: 'Unknown Sender' },
                { reference: 'NEFT/ICIC/00293', amount: 23334, date: '2026-10-13', senderName: 'Amit P' },
                { reference: 'UPI/GPY/827364', amount: 11250, date: '2026-10-16', senderName: 'Kavita N' },
              ]
            })
          }).then(r => r.json()).then(d => { setCsvData(d.matches || []); setProcessing(false); });
        }}
        className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
      >
        → Load demo statement (5 transactions)
      </button>

      {/* Results */}
      {csvData.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Matched', count: matched.length + suspicious.filter(r => r.confidence > 70).length, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' },
              { label: 'Unmatched', count: unmatched.length, color: 'text-rose-400 border-rose-500/30 bg-rose-950/20' },
              { label: 'Suspicious', count: suspicious.filter(r => r.confidence <= 70).length, color: 'text-amber-400 border-amber-500/30 bg-amber-950/20' },
            ].map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border ${s.color} text-center`}>
                <div className={`font-display text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.count}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Match Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Matched Student</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {csvData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-200 text-[11px]">{row.reference}</td>
                      <td className="py-3 px-4 text-white font-bold">₹{row.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-400">{row.date}</td>
                      <td className="py-3 px-4 text-slate-200 font-sans">{row.matchedStudentName || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${row.confidence >= 80 ? 'bg-emerald-400' : row.confidence >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                              style={{ width: `${row.confidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">{row.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          row.status === 'matched' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                          row.status === 'suspicious' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                          'bg-rose-950 text-rose-400 border-rose-800'
                        }`}>
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {row.status !== 'matched' && row.matchedEmiId && (
                          <button
                            onClick={() => handleApprove(row)}
                            disabled={approving === row.reference}
                            className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
                          >
                            {approving === row.reference ? 'Applying...' : 'Approve Match'}
                          </button>
                        )}
                        {row.status === 'unmatched' && !row.matchedEmiId && (
                          <span className="text-[10px] text-slate-500">Manual review needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
