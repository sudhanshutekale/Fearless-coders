'use client';

import React, { useEffect, useState } from 'react';
import { Video, Search, Play, Clock, Tag, ExternalLink, Plus, X, Upload } from 'lucide-react';

export default function RecordingsPage() {
  const [data, setData] = useState<any>({ recordings: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    batchId: 'b_java_m1', title: '', url: '', date: '2026-10-16', durationMinutes: '90', topicTags: ''
  });
  const [uploading, setUploading] = useState(false);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBatch) params.set('batchId', filterBatch);
      const res = await fetch(`/api/recordings?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecordings(); }, [filterBatch]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadForm)
      });
      if (res.ok) { setShowUpload(false); fetchRecordings(); }
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const filtered = data.recordings?.filter((r: any) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.course_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.topic_tags?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-violet-400 block mb-1">
            Lecture Archive & Session Vault
          </span>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Class Recordings
            <span className="ml-2 text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {data.recordings?.length || 0} Videos
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tagged class recordings with topic search and view analytics.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-neon-violet hover:brightness-110"
        >
          <Upload className="w-4 h-4" /> Add Recording
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, topic, course..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Batches</option>
          {data.batches?.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse"></div>
          ))
        ) : filtered?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-500 text-sm">No recordings found.</div>
        ) : (
          filtered?.map((rec: any) => (
            <div key={rec.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-violet-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-400 border border-violet-500/30">
                    {rec.course_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rec.duration_minutes} min
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-white group-hover:text-violet-300 transition-colors mb-1 leading-tight">
                  {rec.title}
                </h4>
                <div className="text-xs text-slate-400 mb-2">{rec.batch_name} &bull; {rec.trainer_name}</div>
                {rec.topic_tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {rec.topic_tags.split(',').map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">{rec.date} &bull; {rec.views_count} views</span>
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-[11px] transition-colors"
                >
                  <Play className="w-3 h-3" /> Watch
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-command-darkest p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-white font-display font-bold text-base flex items-center gap-2">
                <Video className="w-4 h-4 text-violet-400" /> Add Recording
              </div>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Session Title *</label>
                <input type="text" required value={uploadForm.title} onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})} placeholder="e.g. L13: Kafka Consumer Groups Deep Dive" className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Batch *</label>
                <select value={uploadForm.batchId} onChange={(e) => setUploadForm({...uploadForm, batchId: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500">
                  {data.batches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Recording URL *</label>
                <input type="url" required value={uploadForm.url} onChange={(e) => setUploadForm({...uploadForm, url: e.target.value})} placeholder="https://cdn.instipilot.com/..." className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Date *</label>
                  <input type="date" required value={uploadForm.date} onChange={(e) => setUploadForm({...uploadForm, date: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Duration (mins)</label>
                  <input type="number" value={uploadForm.durationMinutes} onChange={(e) => setUploadForm({...uploadForm, durationMinutes: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Topic Tags (comma separated)</label>
                <input type="text" value={uploadForm.topicTags} onChange={(e) => setUploadForm({...uploadForm, topicTags: e.target.value})} placeholder="kafka, microservices, java" className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium">
                  {uploading ? 'Saving...' : 'Save Recording'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
