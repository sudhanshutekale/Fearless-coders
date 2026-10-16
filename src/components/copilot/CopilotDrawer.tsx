'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Database,
  ExternalLink,
  RotateCcw,
  Terminal,
  MessageSquare
} from 'lucide-react';
import { AuthUser } from '@/lib/rbac/user-types';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/rbac/permissions';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: any[];
  actionPreview?: {
    type: 'whatsapp_draft' | 'status_update';
    items: {
      recipientName: string;
      recipientPhone: string;
      messageText: string;
      reason: string;
      studentId?: string;
    }[];
  };
  blocked?: boolean;
  blockedReason?: string;
  executionTimeMs?: number;
  timestamp: string;
}

function FormattedContent({ 
  content, 
  onPromptClick 
}: { 
  content: string; 
  onPromptClick?: (prompt: string) => void;
}) {
  const lines = content.split('\n');
  return (
    <div className="text-xs text-slate-300 leading-relaxed space-y-1">
      {lines.map((line, idx) => {
        if (line.trim() === '---') {
          return <hr key={idx} className="border-slate-800 my-2" />;
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-display font-bold text-sm text-cyan-300 pt-1">
              {formatInline(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-display font-bold text-sm text-cyan-200 pt-1">
              {formatInline(line.slice(3))}
            </h3>
          );
        }
        if (line.includes('👉 *Ask:')) {
          const match = line.match(/👉 \*Ask: "(.*?)"\*/);
          if (match && onPromptClick) {
            return (
              <div key={idx} className="pl-3 py-1">
                <button
                  type="button"
                  onClick={() => onPromptClick(match[1])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition-all text-xs font-medium shadow-sm hover:scale-[1.02] active:scale-95 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110" />
                  <span>{match[1]}</span>
                </button>
              </div>
            );
          }
        }
        if (line.trim().length === 0) {
          return <div key={idx} className="h-0.5" />;
        }
        return (
          <div key={idx} className={line.startsWith('• ') ? 'pl-2 text-slate-200' : ''}>
            {formatInline(line)}
          </div>
        );
      })}
    </div>
  );
}

function formatInline(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
        >
          {match[2]}
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <code key={key++} className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-cyan-300 text-[11px]">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {match[5]}
        </strong>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function CopilotDrawer({ isOpen, onClose, currentUser }: CopilotDrawerProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedSqlId, setExpandedSqlId] = useState<string | null>(null);
  const [approvedActionIds, setApprovedActionIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roleConfig = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.owner;

  // Suggested questions based on active role
  const suggestedQuestions: Record<UserRole, string[]> = {
    owner: [
      "Show all details of student Aarav Gupta",
      "Tell me about student Rohan Gupta",
      "Which students in the Java batch have missed 3 or more classes and have an EMI due this week?",
      "Who are the top 5 students most at risk of dropping out?",
      "Are any trainers near double-booking or have conflicting batch hours?"
    ],
    counselor: [
      "Tell me about student Rohan Gupta",
      "Which students in Java Fullstack have missed more than 3 classes?",
      "Draft an encouraging check-in WhatsApp for students with recent absences.",
      "Show class attendance summary for this week across all ongoing batches."
    ],
    trainer: [
      "Details of student Aarav Gupta",
      "Show attendance summary for my Java Morning batch.",
      "List students who haven't submitted the Spring Boot assignment.",
      "What is my timetable schedule for this week?"
    ],
    accounts: [
      "Fee details of student Aarav Gupta",
      "List all pending and overdue EMIs due in the next 7 days.",
      "Show total fee collected this month grouped by payment method (UPI vs Bank).",
      "Which students have consecutive overdue installments?"
    ]
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || loading) return;

    const userMsgId = `msg_user_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend }),
      });

      const result = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        role: 'assistant',
        content: result.explanation || result.error || 'No explanation returned.',
        sql: result.sql,
        data: result.data,
        actionPreview: result.actionPreview,
        blocked: result.blocked,
        blockedReason: result.blockedReason,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([...newMessages, assistantMsg]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `Connection error: ${err.message}`,
          blocked: true,
          blockedReason: 'Failed to contact copilot backend service.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (msgId: string, actionItem: any) => {
    try {
      const res = await fetch('/api/outbox/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: actionItem.studentId,
          recipientPhone: actionItem.recipientPhone,
          recipientName: actionItem.recipientName,
          messageText: actionItem.messageText,
          draftReason: actionItem.reason,
          channel: 'whatsapp'
        })
      });

      if (res.ok) {
        setApprovedActionIds(prev => ({ ...prev, [`${msgId}_${actionItem.recipientPhone}`]: true }));
        // Open wa.me link simulation
        const cleanPhone = actionItem.recipientPhone.replace(/[^0-9]/g, '');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(actionItem.messageText)}`;
        window.open(waUrl, '_blank');
      }
    } catch (e) {
      console.error('Failed to approve action', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-xl h-full bg-command-darkest border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-neon-cyan">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-white">InstiPilot AI Copilot</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  {currentUser.role.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Natural-language SQL &bull; Read-Only Sandbox &bull; Human-in-the-Loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-neon-cyan">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-display font-semibold text-white text-base mb-1">
                How can InstiPilot assist you today?
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Ask operational questions in plain English. Your role (<span className="text-cyan-300 capitalize">{currentUser.role}</span>) strictly constrains which database tables can be analyzed.
              </p>

              {/* Suggested Questions */}
              <div className="w-full text-left">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Suggested for your role
                </div>
                <div className="space-y-2">
                  {suggestedQuestions[currentUser.role]?.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-cyan-500/40 hover:bg-slate-800/70 transition-all flex items-center justify-between group"
                    >
                      <span className="line-clamp-2">{q}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* User Message */}
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2.5 text-xs text-white shadow-md">
                    <p className="leading-relaxed">{msg.content}</p>
                    <span className="text-[9px] text-cyan-100/70 mt-1 block text-right font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  /* Assistant Message */
                  <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-200 space-y-3">
                    {/* Blocked Alert or Success */}
                    {msg.blocked ? (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-rose-200">Blocked by Security Policy</div>
                          <div className="text-[11px] text-rose-300/90 mt-0.5">
                            {msg.blockedReason || msg.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <FormattedContent content={msg.content} onPromptClick={handleSend} />
                    )}

                    {/* Table of query results if available */}
                    {msg.data && msg.data.length > 0 && (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Result Records ({msg.data.length})</span>
                          {msg.executionTimeMs && <span>{msg.executionTimeMs}ms</span>}
                        </div>
                        <div className="max-h-52 overflow-x-auto overflow-y-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-medium">
                              <tr>
                                {Object.keys(msg.data[0]).map((key) => (
                                  <th key={key} className="px-2.5 py-1.5 font-mono text-[10px]">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {msg.data.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-800/40">
                                  {Object.values(row).map((val: any, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1.5 text-slate-300 truncate max-w-[150px]">
                                      {val !== null && val !== undefined ? String(val) : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Action Preview Card (Human-in-the-Loop) */}
                    {msg.actionPreview && msg.actionPreview.items.length > 0 && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            Action Preview &bull; {msg.actionPreview.items.length} WhatsApp Drafts
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                            Requires Human Approval
                          </span>
                        </div>

                        <div className="space-y-2">
                          {msg.actionPreview.items.map((item, aIdx) => {
                            const isApproved = approvedActionIds[`${msg.id}_${item.recipientPhone}`];
                            return (
                              <div
                                key={aIdx}
                                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between font-medium text-slate-200">
                                  <span>{item.recipientName} ({item.recipientPhone})</span>
                                  {isApproved ? (
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                      <CheckCircle className="w-3 h-3" /> Approved & Sent
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">Pending Review</span>
                                  )}
                                </div>
                                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {item.messageText}
                                </div>
                                <div className="text-[10px] text-slate-400 italic">
                                  Reason: {item.reason}
                                </div>

                                {!isApproved && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={() => handleApproveAction(msg.id, item)}
                                      className="py-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Approve & Dispatch
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Collapsible Verified SQL Query */}
                    {msg.sql && (
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 overflow-hidden">
                        <button
                          onClick={() => setExpandedSqlId(expandedSqlId === msg.id ? null : msg.id)}
                          className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-cyan-400" />
                            Verified Read-Only SQL Query
                          </span>
                          {expandedSqlId === msg.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {expandedSqlId === msg.id && (
                          <div className="p-3 bg-black/50 border-t border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre">
                            {msg.sql}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[9px] text-slate-500 font-mono pt-1 flex items-center justify-between">
                      <span>InstiPilot Safety Guard: Read-Only WAL</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Generating AST-validated SQL & verifying schema allowlist...
              </div>
              <div className="h-3 bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask Copilot as ${currentUser.role}...`}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white disabled:opacity-40 hover:brightness-110 transition-all shadow-neon-cyan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Press Esc to close</span>
            <span>Zero Mutation Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
