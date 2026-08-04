'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit3, Trash2, Copy, Eye, Trophy, Users, Calendar, Star,
  AlertCircle, CheckCircle2, Save, X, Plus, ChevronUp, ChevronDown, Crown,
} from 'lucide-react';
import '../../AdminDashboard.css';
import './manage.css';

export default function ContestManagePage({ params }) {
  const { slug } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [historyCycles, setHistoryCycles] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Edit modal
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Winners modal
  const [winnersCycle, setWinnersCycle] = useState(null);
  const [winnersDraft, setWinnersDraft] = useState({ first: '', second: '', third: '', mentions: [], notes: '' });
  const [winnersSaving, setWinnersSaving] = useState(false);

  // Judging modal
  const [judgingSub, setJudgingSub] = useState(null);
  const [judgeForm, setJudgeForm] = useState({ score: 0, feedback: '' });
  const [judgeSaving, setJudgeSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authRes = await fetch('/api/auth/check', { credentials: 'include' });
        const authData = await authRes.json();
        if (cancelled) return;
        if (!authData.authenticated) { router.replace('/admin'); return; }
        setAuthReady(true);
        await loadAll();
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadAll = async () => {
    setError('');
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/contests/${slug}`),
        fetch(`/api/contests/${slug}/submissions?limit=200`),
      ]);
      if (!tRes.ok) throw new Error('Contest not found');
      const tData = await tRes.json();
      setTemplate(tData.template);
      setActiveCycle(tData.activeCycle);
      setHistoryCycles(tData.historyCycles || []);

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setSubmissions(Array.isArray(sData.submissions) ? sData.submissions : []);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerAction = async (action, extra = {}) => {
    setActionBusy(true); setActionMsg(''); setError('');
    try {
      const res = await fetch(`/api/contests/${slug}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setActionMsg(data.message || 'Done.');
      await loadAll();
    } catch (err) { setError(err.message); }
    finally {
      setActionBusy(false);
      setTimeout(() => setActionMsg(''), 2500);
    }
  };

  const deleteContest = async () => {
    if (!confirm(`Delete contest "${template?.title}"? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/contests/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Delete failed');
      }
      router.replace('/admin/dashboard?tab=contests');
    } catch (err) { setError(err.message); setActionBusy(false); }
  };

  const openEdit = () => {
    if (!template) return;
    setEditForm({
      title: template.title || '',
      description: template.description || '',
      bannerUrl: template.bannerUrl || '',
      rules: template.rules || '',
      eligibility: template.eligibility || '',
      submissionGuidelines: template.submissionGuidelines || '',
      prizeInfo: template.prizeInfo || '',
      tags: (template.tags || []).join(', '),
      visibility: template.visibility || 'public',
      featured: !!template.featured,
      isPublished: template.isPublished !== false,
      schedule: {
        startDate: template.schedule?.startDate || '',
        endDate: template.schedule?.endDate || '',
        startDay: template.schedule?.startDay ?? 0,
        startTime: template.schedule?.startTime || '00:00',
        endDay: template.schedule?.endDay ?? 6,
        endTime: template.schedule?.endTime || '23:59',
        startDayOfMonth: template.schedule?.startDayOfMonth ?? 1,
        endDayOfMonth: template.schedule?.endDayOfMonth ?? 28,
      },
      customFields: Array.isArray(template.customFields) ? template.customFields.map(f => ({ ...f })) : [],
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true); setError('');
    try {
      const payload = {
        ...editForm,
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : editForm.tags,
        schedule: {
          ...editForm.schedule,
          startDate: editForm.schedule.startDate || null,
          endDate: editForm.schedule.endDate || null,
          startDay: parseInt(editForm.schedule.startDay, 10),
          endDay: parseInt(editForm.schedule.endDay, 10),
          startDayOfMonth: parseInt(editForm.schedule.startDayOfMonth, 10),
          endDayOfMonth: parseInt(editForm.schedule.endDayOfMonth, 10),
        },
        customFields: editForm.customFields || [],
      };
      const res = await fetch(`/api/contests/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      setEditing(false);
      await loadAll();
    } catch (err) { setError(err.message); }
    finally { setEditSaving(false); }
  };

  const updateField = (idx, patch) => {
    setEditForm(prev => {
      const next = [...prev.customFields];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, customFields: next };
    });
  };
  const addField = () => {
    setEditForm(prev => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: `f_${Date.now()}`, label: 'New Field', type: 'text', required: false, maxSizeMB: 10, maxCount: 1, options: [] },
      ],
    }));
  };
  const removeField = (idx) => setEditForm(prev => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== idx) }));
  const moveField = (idx, dir) => setEditForm(prev => {
    const next = [...prev.customFields];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[idx], next[j]] = [next[j], next[idx]];
    return { ...prev, customFields: next };
  });

  const openWinners = (cycle) => {
    setWinnersCycle(cycle);
    const w = cycle.winners || [];
    setWinnersDraft({
      first: w.find(x => x.rank === 1)?.memberId || '',
      second: w.find(x => x.rank === 2)?.memberId || '',
      third: w.find(x => x.rank === 3)?.memberId || '',
      mentions: w.filter(x => x.rank === 'mention').map(x => x.memberId),
      notes: cycle.announcementNotes || '',
    });
  };

  const saveWinners = async () => {
    setWinnersSaving(true); setError('');
    try {
      const winners = [];
      if (winnersDraft.first) winners.push({ rank: 1, memberId: winnersDraft.first });
      if (winnersDraft.second) winners.push({ rank: 2, memberId: winnersDraft.second });
      if (winnersDraft.third) winners.push({ rank: 3, memberId: winnersDraft.third });
      winnersDraft.mentions.filter(Boolean).forEach(m => winners.push({ rank: 'mention', memberId: m }));

      const res = await fetch(`/api/contests/${slug}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleNumber: winnersCycle.cycleNumber,
          winners,
          announcementNotes: winnersDraft.notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Publish failed');
      }
      setWinnersCycle(null);
      await loadAll();
    } catch (err) { setError(err.message); }
    finally { setWinnersSaving(false); }
  };

  const openJudging = (sub) => {
    setJudgingSub(sub);
    setJudgeForm({ score: sub.score || 0, feedback: sub.judgeFeedback || '' });
  };

  const saveJudging = async () => {
    setJudgeSaving(true); setError('');
    try {
      const res = await fetch(`/api/contests/${slug}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'judge_submission',
          submissionId: judgingSub._id,
          score: judgeForm.score,
          feedback: judgeForm.feedback,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      setJudgingSub(null);
      await loadAll();
    } catch (err) { setError(err.message); }
    finally { setJudgeSaving(false); }
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalParticipants = historyCycles.reduce((sum, c) => sum + (c.participantCount || 0), 0);

  if (!authReady || loading) {
    return (
      <div className="admin-dash">
        <main className="admin-main">
          <div className="admin-main__content">
            <div className="admin-rec-loading">Loading contest…</div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="admin-dash">
        <main className="admin-main">
          <div className="admin-main__content">
            <button className="admin-dash__back-link" onClick={() => router.push('/admin/dashboard?tab=contests')}>
              <ArrowLeft size={16} /> Back to Contests
            </button>
            <div className="admin-dash__alert admin-dash__alert--error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dash">
      <main className="admin-main">
        <div className="admin-main__content" data-lenis-prevent="true">

          <div className="cm-topbar">
            <button className="admin-dash__back-link" onClick={() => router.push('/admin/dashboard?tab=contests')}>
              <ArrowLeft size={16} /> Back to Contests
            </button>
            <div className="cm-topbar__actions">
              <button className="admin-dash__icon-btn" title="View Public Page" onClick={() => window.open(`/contests/${slug}`, '_blank')}>
                <Eye size={15} />
              </button>
              <button className="admin-dash__icon-btn" title="Edit Template" onClick={openEdit}>
                <Edit3 size={15} />
              </button>
              <button className="admin-dash__icon-btn" title="Duplicate" disabled={actionBusy} onClick={() => triggerAction('duplicate')}>
                <Copy size={15} />
              </button>
              <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" title="Delete" disabled={actionBusy} onClick={deleteContest}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {error && (
            <div className="admin-dash__alert admin-dash__alert--error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}
          {actionMsg && (
            <div className="admin-dash__alert admin-dash__alert--success">
              <CheckCircle2 size={18} /> <span>{actionMsg}</span>
            </div>
          )}

          {/* Hero */}
          <section className="cm-hero">
            <div className="cm-hero__banner">
              {template?.bannerUrl ? (
                <img src={template.bannerUrl} alt={template.title} />
              ) : (
                <div className="cm-hero__banner-fallback"><Trophy size={48} /></div>
              )}
              <div className="cm-hero__overlay" />
            </div>
            <div className="cm-hero__body">
              <div className="cm-hero__chips">
                <span className="admin-rec-status-indicator admin-rec-status-indicator--open">
                  {template?.type?.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`admin-rec-status-indicator admin-rec-status-indicator--${template?.isPublished ? 'open' : 'closed'}`}>
                  {template?.isPublished ? '● PUBLISHED' : '● DRAFT'}
                </span>
                {template?.isPaused && (
                  <span className="admin-rec-status-indicator admin-rec-status-indicator--closed">⏸ PAUSED</span>
                )}
                {template?.featured && (
                  <span className="admin-rec-status-indicator admin-rec-status-indicator--open">⭐ FEATURED</span>
                )}
              </div>
              <h1 className="cm-hero__title">{template?.title}</h1>
              <p className="cm-hero__slug">/contests/{template?.slug}</p>
              {template?.description && <p className="cm-hero__desc">{template.description}</p>}
            </div>
          </section>

          {/* Stat cards */}
          <div className="cm-stats">
            <div className="cm-stat"><Users size={18} /><div><strong>{totalParticipants}</strong><span>Total Participants</span></div></div>
            <div className="cm-stat"><Trophy size={18} /><div><strong>{submissions.length}</strong><span>Submissions</span></div></div>
            <div className="cm-stat"><Calendar size={18} /><div><strong>{historyCycles.length}</strong><span>Cycles Recorded</span></div></div>
            <div className="cm-stat"><Star size={18} /><div><strong>{(template?.customFields || []).length}</strong><span>Form Fields</span></div></div>
          </div>

          {/* Quick actions */}
          <section className="cm-section">
            <h2 className="cm-section__title">Quick Actions</h2>
            <div className="cm-actions">
              <button className="cm-action" disabled={actionBusy} onClick={() => triggerAction(template?.isPublished ? 'unpublish' : 'publish')}>
                {template?.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button className="cm-action" disabled={actionBusy} onClick={() => triggerAction(template?.isPaused ? 'resume' : 'pause')}>
                {template?.isPaused ? 'Resume Cycle' : 'Pause Cycle'}
              </button>
              <button className="cm-action" disabled={actionBusy || !activeCycle} onClick={() => triggerAction('extend_deadline', { hours: 24 })}>
                +24h Extend Deadline
              </button>
              <button className="cm-action" disabled={actionBusy || !activeCycle} onClick={() => triggerAction('end_early')}>
                End Cycle Early
              </button>
              {activeCycle && (
                <button className="cm-action cm-action--accent" onClick={() => openWinners(activeCycle)}>
                  <Trophy size={14} /> Declare Winners
                </button>
              )}
            </div>
          </section>

          {/* Active cycle + submissions */}
          <section className="cm-section">
            <div className="cm-section__header">
              <h2 className="cm-section__title">Active Cycle & Submissions</h2>
              {activeCycle && (
                <span className={`admin-rec-status-indicator admin-rec-status-indicator--${activeCycle.status === 'active' ? 'open' : 'closed'}`}>
                  {activeCycle.status.toUpperCase()}
                </span>
              )}
            </div>
            {activeCycle ? (
              <div className="cm-cycle-info">
                <div className="cm-cycle-info__row"><span>Label</span><strong>{activeCycle.cycleLabel} (Cycle #{activeCycle.cycleNumber})</strong></div>
                <div className="cm-cycle-info__row"><span>Window</span><strong>{new Date(activeCycle.startTime).toLocaleString()} → {new Date(activeCycle.endTime).toLocaleString()}</strong></div>
                <div className="cm-cycle-info__row"><span>Participants</span><strong>{activeCycle.participantCount || 0}</strong></div>
                <div className="cm-cycle-info__row"><span>Submissions</span><strong>{activeCycle.submissionCount || 0}</strong></div>
              </div>
            ) : <p className="cm-empty">No active cycle.</p>}

            {submissions.length === 0 ? (
              <p className="cm-empty">No submissions yet.</p>
            ) : (
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Submission</th>
                      <th>Score</th>
                      <th>Submitted</th>
                      <th>Judge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s._id}>
                        <td>
                          <strong>{s.name}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.45)' }}>{s.rollNumber || s.email}</div>
                        </td>
                        <td>
                          {Array.isArray(s.files) && s.files.length > 0 && (
                            <div className="cm-file-chips">
                              {s.files.map((f, i) => (
                                <a key={i} href={f.url} target="_blank" rel="noreferrer" className="cm-file-chip" title={`${f.originalName} (${formatBytes(f.fileSize)})`}>
                                  {f.fieldType === 'image' && f.url ? (
                                    <img src={f.url} alt={f.originalName} />
                                  ) : (
                                    <span>{f.fieldType === 'video' ? '🎥' : '📎'}</span>
                                  )}
                                  <span>{f.originalName || f.fieldLabel || 'File'}</span>
                                </a>
                              ))}
                            </div>
                          )}
                          {Array.isArray(s.customAnswers) && s.customAnswers.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: '0.74rem', color: 'rgba(255,255,255,0.55)' }}>
                              {s.customAnswers.filter(a => !['image', 'video', 'file', 'link'].includes(a.type)).map((a, i) => (
                                <div key={i}><strong style={{ color: '#ffd86b' }}>{a.label}:</strong> {String(a.value || '—').slice(0, 80)}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>{s.score || 0}</td>
                        <td style={{ fontSize: '0.78rem' }}>{new Date(s.submittedAt).toLocaleDateString()}</td>
                        <td>
                          <button className="admin-dash__icon-btn" onClick={() => openJudging(s)} title="Judge">
                            <Edit3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* History */}
          <section className="cm-section">
            <h2 className="cm-section__title">Cycle History ({historyCycles.length})</h2>
            {historyCycles.length === 0 ? (
              <p className="cm-empty">No past cycles yet.</p>
            ) : (
              <div className="cm-history">
                {historyCycles.map(c => (
                  <div key={c._id || c.cycleNumber} className="cm-history-row">
                    <div>
                      <strong>{c.cycleLabel}</strong>{' '}
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>(Cycle #{c.cycleNumber})</span>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                        {new Date(c.startTime).toLocaleDateString()} → {new Date(c.endTime).toLocaleDateString()} • {c.participantCount || 0} entries
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`admin-rec-status-indicator admin-rec-status-indicator--${c.status === 'active' ? 'open' : 'closed'}`}>
                        {c.status.toUpperCase()}
                      </span>
                      {(c.winners?.length > 0) ? (
                        <button className="admin-dash__icon-btn" title="View Winners" onClick={() => openWinners(c)}>
                          <Crown size={14} />
                        </button>
                      ) : c.status !== 'active' ? (
                        <button className="admin-dash__icon-btn" title="Declare Winners" onClick={() => openWinners(c)}>
                          <Trophy size={14} style={{ color: '#f59e0b' }} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Template details */}
          <section className="cm-section">
            <h2 className="cm-section__title">Template Details</h2>
            <div className="cm-detail-grid">
              <div className="cm-detail"><span>Visibility</span><strong>{template?.visibility}</strong></div>
              <div className="cm-detail"><span>Tags</span><strong>{(template?.tags || []).join(', ') || '—'}</strong></div>
              <div className="cm-detail cm-detail--full"><span>Rules</span><p>{template?.rules || '—'}</p></div>
              <div className="cm-detail cm-detail--full"><span>Eligibility</span><p>{template?.eligibility || '—'}</p></div>
              <div className="cm-detail cm-detail--full"><span>Submission Guidelines</span><p>{template?.submissionGuidelines || '—'}</p></div>
              <div className="cm-detail cm-detail--full"><span>Prize Info</span><p>{template?.prizeInfo || '—'}</p></div>
            </div>

            <h3 style={{ marginTop: 20, fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)' }}>Form Fields ({(template?.customFields || []).length})</h3>
            {(template?.customFields || []).length === 0 ? (
              <p className="cm-empty">No custom fields defined.</p>
            ) : (
              <ul className="cm-fields">
                {template.customFields.map((f, i) => (
                  <li key={i}>
                    <strong>{f.label}</strong> {f.required && <span style={{ color: '#ff8080' }}>*</span>}
                    <span className="cm-fields__type">{f.type}</span>
                    {(f.type === 'image' || f.type === 'video' || f.type === 'file') && (
                      <span className="cm-fields__meta">≤ {f.maxSizeMB} MB</span>
                    )}
                    {(f.type === 'image' || f.type === 'link') && (
                      <span className="cm-fields__meta">max {f.maxCount}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </main>

      {/* Edit modal */}
      {editing && editForm && (
        <div className="admin-dash__overlay" onClick={() => !editSaving && setEditing(false)}>
          <div className="admin-dash__modal" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Edit Contest Template</h2>
              <button className="admin-dash__close-btn" onClick={() => setEditing(false)} disabled={editSaving}><X size={20} /></button>
            </div>
            <form onSubmit={saveEdit} className="admin-dash__modal-body">
              <div className="admin-dash__form-grid">
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Title *</label>
                  <input type="text" required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Description</label>
                  <textarea rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="admin-dash__field">
                  <label>Banner URL</label>
                  <input type="text" value={editForm.bannerUrl} onChange={e => setEditForm({ ...editForm, bannerUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div className="admin-dash__field">
                  <label>Tags (comma-separated)</label>
                  <input type="text" value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Rules</label>
                  <textarea rows={2} value={editForm.rules} onChange={e => setEditForm({ ...editForm, rules: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Eligibility</label>
                  <textarea rows={2} value={editForm.eligibility} onChange={e => setEditForm({ ...editForm, eligibility: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Prize Info</label>
                  <textarea rows={2} value={editForm.prizeInfo} onChange={e => setEditForm({ ...editForm, prizeInfo: e.target.value })} />
                </div>

                <div className="admin-dash__field admin-dash__field--full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ margin: 0 }}>Custom Form Fields</label>
                    <button type="button" className="admin-dash__save-btn" onClick={addField} style={{ padding: '6px 12px' }}>
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
                  {editForm.customFields.map((field, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                        <input type="text" className="admin-dash__input" placeholder="Field label" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} />
                        <select className="admin-dash__input" value={field.type} onChange={e => updateField(idx, { type: e.target.value })}>
                          <option value="text">Text</option>
                          <option value="textarea">Writeup</option>
                          <option value="number">Number</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="file">File</option>
                          <option value="link">Work Link</option>
                          <option value="select">Dropdown</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', margin: 0 }}>
                          <input type="checkbox" checked={!!field.required} onChange={e => updateField(idx, { required: e.target.checked })} /> Req
                        </label>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp size={13} /></button>
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveField(idx, 1)} disabled={idx === editForm.customFields.length - 1}><ChevronDown size={13} /></button>
                          <button type="button" className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => removeField(idx)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {(field.type === 'image' || field.type === 'video' || field.type === 'file' || field.type === 'link') && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: '0.78rem' }}>
                          {(field.type === 'image' || field.type === 'video' || field.type === 'file') && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              Max MB:
                              <input type="number" min={1} max={1000} style={{ width: 60 }} className="admin-dash__input" value={field.maxSizeMB || 10} onChange={e => updateField(idx, { maxSizeMB: parseInt(e.target.value, 10) || 10 })} />
                            </label>
                          )}
                          {(field.type === 'image' || field.type === 'link') && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              Max count:
                              <input type="number" min={1} max={20} style={{ width: 60 }} className="admin-dash__input" value={field.maxCount || 1} onChange={e => updateField(idx, { maxCount: parseInt(e.target.value, 10) || 1 })} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="admin-dash__field">
                  <label>Featured</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <input type="checkbox" checked={editForm.featured} onChange={e => setEditForm({ ...editForm, featured: e.target.checked })} />
                    Spotlight on landing
                  </label>
                </div>
                <div className="admin-dash__field">
                  <label>Published</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <input type="checkbox" checked={editForm.isPublished} onChange={e => setEditForm({ ...editForm, isPublished: e.target.checked })} />
                    Visible publicly
                  </label>
                </div>
              </div>

              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setEditing(false)} disabled={editSaving}>Cancel</button>
                <button type="submit" className="admin-dash__save-btn" disabled={editSaving}>
                  <Save size={14} /> {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Winners modal */}
      {winnersCycle && (
        <div className="admin-dash__overlay" onClick={() => !winnersSaving && setWinnersCycle(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Declare Winners — {winnersCycle.cycleLabel}</h2>
              <button className="admin-dash__close-btn" onClick={() => setWinnersCycle(null)} disabled={winnersSaving}><X size={20} /></button>
            </div>
            <div className="admin-dash__modal-body">
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.86rem' }}>
                Pick winners from {submissions.length} submission(s). Leave fields blank to skip a rank.
              </p>
              {[
                { key: 'first', label: '🥇 1st Place' },
                { key: 'second', label: '🥈 2nd Place' },
                { key: 'third', label: '🥉 3rd Place' },
              ].map(r => (
                <div key={r.key} className="admin-dash__field">
                  <label>{r.label}</label>
                  <select
                    className="admin-dash__input"
                    value={winnersDraft[r.key]}
                    onChange={e => setWinnersDraft({ ...winnersDraft, [r.key]: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {submissions.map(s => (
                      <option key={s._id} value={s.memberId}>
                        {s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="admin-dash__field admin-dash__field--full">
                <label>Special Mentions (comma-separated member IDs)</label>
                <input
                  type="text"
                  className="admin-dash__input"
                  value={winnersDraft.mentions.join(', ')}
                  onChange={e => setWinnersDraft({
                    ...winnersDraft,
                    mentions: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                  })}
                  placeholder="memberId1, memberId2"
                />
              </div>

              <div className="admin-dash__field admin-dash__field--full">
                <label>Judges' Announcement Notes</label>
                <textarea
                  rows={3}
                  value={winnersDraft.notes}
                  onChange={e => setWinnersDraft({ ...winnersDraft, notes: e.target.value })}
                  placeholder="A short note that will appear on the Winners tab..."
                />
              </div>

              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setWinnersCycle(null)} disabled={winnersSaving}>Cancel</button>
                <button type="button" className="admin-dash__save-btn" disabled={winnersSaving} onClick={saveWinners}>
                  <Trophy size={14} /> {winnersSaving ? 'Publishing...' : 'Publish Winners'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Judging modal */}
      {judgingSub && (
        <div className="admin-dash__overlay" onClick={() => !judgeSaving && setJudgingSub(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Judge Submission — {judgingSub.name}</h2>
              <button className="admin-dash__close-btn" onClick={() => setJudgingSub(null)} disabled={judgeSaving}><X size={20} /></button>
            </div>
            <div className="admin-dash__modal-body">
              <div className="admin-dash__field">
                <label>Score (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="admin-dash__input"
                  value={judgeForm.score}
                  onChange={e => setJudgeForm({ ...judgeForm, score: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="admin-dash__field admin-dash__field--full">
                <label>Feedback / Judge Notes</label>
                <textarea
                  rows={4}
                  value={judgeForm.feedback}
                  onChange={e => setJudgeForm({ ...judgeForm, feedback: e.target.value })}
                  placeholder="Internal notes..."
                />
              </div>

              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setJudgingSub(null)} disabled={judgeSaving}>Cancel</button>
                <button type="button" className="admin-dash__save-btn" disabled={judgeSaving} onClick={saveJudging}>
                  <Save size={14} /> {judgeSaving ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}