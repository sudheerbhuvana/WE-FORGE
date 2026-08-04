'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit3, Trash2, Copy, Eye, Trophy, Upload, Pause, Play, X, Save,
  Plus, ChevronUp, ChevronDown, FileText, FileVideo, ExternalLink, Download,
  Link2, Sparkles, Layers, Grid3x3, BarChart3, Settings as SettingsIcon,
  CalendarClock, Clock, Users, Globe, Lock, Star, AlertCircle, CheckCircle2,
} from 'lucide-react';
import '../../AdminDashboard.css';
import './manage.css';
import OverviewTab from './tabs/OverviewTab';
import SubmissionsTab from './tabs/SubmissionsTab';
import WinnersTab from './tabs/WinnersTab';
import CyclesTab from './tabs/CyclesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import SettingsTab from './tabs/SettingsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Grid3x3 },
  { id: 'submissions', label: 'Submissions', icon: Upload },
  { id: 'winners', label: 'Winners', icon: Trophy },
  { id: 'cycles', label: 'Cycles', icon: CalendarClock },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const TYPE_LABEL = {
  one_time: 'One-Time',
  immediate: 'Immediate',
  recurring_weekly: 'Weekly',
  recurring_monthly: 'Monthly',
};

const STATUS_VARIANT = {
  draft: 'neutral', upcoming: 'info', active: 'success',
  submission_closed: 'warning', judging: 'warning',
  results_published: 'purple', archived: 'neutral',
  completed: 'success', published: 'success', paused: 'warning',
};

function relTime(d) {
  if (!d) return '—';
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ${Math.floor((diff % 86400000) / 3600000)}h`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ${Math.floor((diff % 3600000) / 60000)}m`;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

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
  const [activeTab, setActiveTab] = useState('overview');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [winnersCycle, setWinnersCycle] = useState(null);
  const [winnersDraft, setWinnersDraft] = useState({ first: '', second: '', third: '', mentions: [], notes: '' });
  const [winnersSaving, setWinnersSaving] = useState(false);
  const [judgingSub, setJudgingSub] = useState(null);
  const [judgeForm, setJudgeForm] = useState({ score: 0, feedback: '' });
  const [judgeSaving, setJudgeSaving] = useState(false);
  const [viewingSub, setViewingSub] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
        fetch(`/api/contests/${slug}/submissions?limit=500`),
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
    finally { setActionBusy(false); setTimeout(() => setActionMsg(''), 2500); }
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

  const duplicateContest = async () => {
    if (!confirm(`Duplicate "${template?.title}"? A new contest with a fresh slug will be created.`)) return;
    await triggerAction('duplicate');
  };

  const exportSubmissions = () => {
    if (!submissions.length) return;
    const rows = [['Name', 'Email', 'Roll Number', 'Title', 'Description', 'Score', 'Status', 'Submitted At']];
    submissions.forEach((s) => {
      rows.push([
        s.name || '', s.email || '', s.rollNumber || '', s.title || '',
        (s.description || '').replace(/\n/g, ' '),
        s.score || 0, s.status || 'submitted',
        s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slug}-submissions.csv`; a.click();
    URL.revokeObjectURL(url);
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
      customFields: Array.isArray(template.customFields) ? template.customFields.map((f) => ({ ...f })) : [],
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true); setError('');
    try {
      const payload = {
        ...editForm,
        tags: typeof editForm.tags === 'string' ? editForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : editForm.tags,
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
    setEditForm((prev) => {
      const next = [...prev.customFields];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, customFields: next };
    });
  };
  const addField = () => setEditForm((prev) => ({
    ...prev,
    customFields: [...prev.customFields, { id: `f_${Date.now()}`, label: 'New Field', type: 'text', required: false, maxSizeMB: 10, maxCount: 1, options: [] }],
  }));
  const removeField = (idx) => setEditForm((prev) => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== idx) }));
  const moveField = (idx, dir) => setEditForm((prev) => {
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
      first: w.find((x) => Number(x.rank) === 1)?.memberId || '',
      second: w.find((x) => Number(x.rank) === 2)?.memberId || '',
      third: w.find((x) => Number(x.rank) === 3)?.memberId || '',
      mentions: w.filter((x) => Number(x.rank) === 99).map((x) => x.memberId),
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
      winnersDraft.mentions.filter(Boolean).forEach((m) => winners.push({ rank: 99, memberId: m }));
      const res = await fetch(`/api/contests/${slug}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: winnersCycle._id, winners, announcementNotes: winnersDraft.notes }),
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
        body: JSON.stringify({ action: 'judge_submission', submissionId: judgingSub._id, score: judgeForm.score, feedback: judgeForm.feedback }),
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

  const totalParticipants = useMemo(
    () => historyCycles.reduce((sum, c) => sum + (c.participantCount || 0), 0),
    [historyCycles]
  );
  const totalSubmissions = submissions.length;
  const winnersPublished = historyCycles.filter((c) => c.status === 'results_published').length;
  const daysRemaining = activeCycle ? Math.max(0, Math.ceil((new Date(activeCycle.endTime).getTime() - Date.now()) / 86400000)) : 0;
  const totalPreviousCycles = historyCycles.length;

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (cycleFilter !== 'all') {
        const subCycle = historyCycles.find((c) => c._id === s.cycleId);
        if (cycleFilter === 'current') {
          if (!activeCycle || subCycle?._id !== activeCycle._id) return false;
        } else if (subCycle?.cycleNumber !== parseInt(cycleFilter, 10)) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = `${s.name || ''} ${s.email || ''} ${s.rollNumber || ''} ${s.title || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, cycleFilter, searchQuery, historyCycles, activeCycle]);

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

  const status = !template?.isPublished ? 'draft'
    : template?.isPaused ? 'paused'
    : activeCycle?.status === 'results_published' ? 'completed'
    : activeCycle?.status === 'judging' ? 'judging'
    : activeCycle?.status === 'active' ? 'active'
    : 'upcoming';

  const statusLabel = {
    draft: 'Draft', upcoming: 'Upcoming', active: 'Active',
    paused: 'Paused', judging: 'Judging', completed: 'Completed', archived: 'Archived',
  }[status];

  const statusVariant = STATUS_VARIANT[status] || 'neutral';

  return (
    <div className="admin-dash">
      <main className="admin-main">
        <div className="admin-main__content" data-lenis-prevent="true">

          {/* ===== Back link (compact) ===== */}
          <button className="cm-back" onClick={() => router.push('/admin/dashboard?tab=contests')}>
            <ArrowLeft size={14} /> Back to Contests
          </button>

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

          {/* ===== Page header — single horizontal row ===== */}
          <header className="cm-page-header">
            <div className="cm-page-header__thumb">
              {template?.bannerUrl ? (
                <img src={template.bannerUrl} alt={template.title} />
              ) : (
                <div className="cm-page-header__thumb-fallback"><Trophy size={28} /></div>
              )}
            </div>
            <div className="cm-page-header__main">
              <div className="cm-page-header__chips">
                <span className={`cm-badge cm-badge--${statusVariant}`}>
                  {status === 'active' && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor', display: 'inline-block' }} />}
                  {statusLabel}
                </span>
                <span className="cm-badge cm-badge--info">
                  <Layers size={11} /> {TYPE_LABEL[template?.type] || 'One-Time'}
                </span>
                {template?.featured && (
                  <span className="cm-badge cm-badge--warning"><Star size={11} /> Featured</span>
                )}
                {template?.isPaused && (
                  <span className="cm-badge cm-badge--warning"><Pause size={11} /> Paused</span>
                )}
                <span className="cm-badge cm-badge--neutral">
                  {template?.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                  {template?.visibility === 'private' ? 'Private' : 'Public'}
                </span>
              </div>
              <h1 className="cm-page-header__title">{template?.title}</h1>
              {template?.description && (
                <p className="cm-page-header__desc">{template.description}</p>
              )}
            </div>
            <div className="cm-page-header__actions">
              <button className="cm-btn cm-btn--primary" onClick={openEdit}>
                <Edit3 size={14} /> Edit Contest
              </button>
              <button className="cm-btn" disabled={actionBusy}
                onClick={() => triggerAction(template?.isPublished ? 'unpublish' : 'publish')}>
                {template?.isPublished ? <><Eye size={14} /> Unpublish</> : <><Sparkles size={14} /> Publish</>}
              </button>
              <button className="cm-btn" disabled={actionBusy}
                onClick={() => triggerAction(template?.isPaused ? 'resume' : 'pause')}>
                {template?.isPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
              </button>
              {activeCycle && (
                <button className="cm-btn cm-btn--accent" onClick={() => openWinners(activeCycle)}>
                  <Trophy size={14} /> Winners
                </button>
              )}
              <button className="cm-btn" onClick={() => window.open(`/contests/${slug}`, '_blank')}>
                <Eye size={14} /> View
              </button>
              <button className="cm-btn" onClick={exportSubmissions}>
                <Download size={14} /> Export
              </button>
              <button className="cm-btn" disabled={actionBusy} onClick={duplicateContest}>
                <Copy size={14} /> Duplicate
              </button>
              <button className="cm-btn cm-btn--danger" disabled={actionBusy} onClick={deleteContest} title="Delete contest">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </header>

          {/* ===== Stats strip — horizontal row ===== */}
          <div className="cm-stats-strip">
            <div className="cm-stats-strip__cell">
              <div className="cm-stats-strip__icon"><Clock size={16} /></div>
              <div className="cm-stats-strip__body">
                <div className="cm-stats-strip__value" key={tick}>
                  {activeCycle?.status === 'active' ? relTime(activeCycle.endTime)
                    : activeCycle?.status === 'upcoming' ? relTime(activeCycle.startTime)
                    : '—'}
                </div>
                <div className="cm-stats-strip__label">
                  {activeCycle?.status === 'active' ? 'Ends In' : activeCycle?.status === 'upcoming' ? 'Starts In' : 'No active cycle'}
                </div>
              </div>
            </div>
            <div className="cm-stats-strip__cell">
              <div className="cm-stats-strip__icon cm-stats-strip__icon--purple"><Users size={16} /></div>
              <div className="cm-stats-strip__body">
                <div className="cm-stats-strip__value">{totalParticipants}</div>
                <div className="cm-stats-strip__label">Participants</div>
              </div>
            </div>
            <div className="cm-stats-strip__cell">
              <div className="cm-stats-strip__icon cm-stats-strip__icon--green"><Upload size={16} /></div>
              <div className="cm-stats-strip__body">
                <div className="cm-stats-strip__value">{totalSubmissions}</div>
                <div className="cm-stats-strip__label">Submissions</div>
              </div>
            </div>
            <div className="cm-stats-strip__cell">
              <div className="cm-stats-strip__icon cm-stats-strip__icon--orange"><Trophy size={16} /></div>
              <div className="cm-stats-strip__body">
                <div className="cm-stats-strip__value">{winnersPublished}</div>
                <div className="cm-stats-strip__label">Winners Published</div>
              </div>
            </div>
            <div className="cm-stats-strip__cell">
              <div className="cm-stats-strip__icon cm-stats-strip__icon--orange"><CalendarClock size={16} /></div>
              <div className="cm-stats-strip__body">
                <div className="cm-stats-strip__value">{totalPreviousCycles}</div>
                <div className="cm-stats-strip__label">Total Cycles</div>
              </div>
            </div>
          </div>

          {/* ===== Tabs ===== */}
          <nav className="cm-tabs" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'submissions' ? totalSubmissions
                : tab.id === 'winners' ? winnersPublished
                : tab.id === 'cycles' ? totalPreviousCycles
                : null;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`cm-tab ${activeTab === tab.id ? 'cm-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} />
                  {tab.label}
                  {count !== null && <span className="cm-tab__badge">{count}</span>}
                </button>
              );
            })}
          </nav>

          {activeTab === 'overview' && (
            <OverviewTab
              template={template} activeCycle={activeCycle} historyCycles={historyCycles}
              submissions={submissions} totalParticipants={totalParticipants}
              totalSubmissions={totalSubmissions} winnersPublished={winnersPublished}
              daysRemaining={daysRemaining} totalPreviousCycles={totalPreviousCycles}
              triggerAction={triggerAction} actionBusy={actionBusy}
              openWinners={openWinners} openJudging={openJudging} openEdit={openEdit}
            />
          )}
          {activeTab === 'submissions' && (
            <SubmissionsTab
              submissions={filteredSubmissions} historyCycles={historyCycles}
              activeCycle={activeCycle} cycleFilter={cycleFilter} setCycleFilter={setCycleFilter}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              onView={setViewingSub} onJudge={openJudging}
            />
          )}
          {activeTab === 'winners' && (
            <WinnersTab
              historyCycles={historyCycles} activeCycle={activeCycle}
              onEditWinner={openWinners} onExport={exportSubmissions}
            />
          )}
          {activeTab === 'cycles' && (
            <CyclesTab historyCycles={historyCycles} activeCycle={activeCycle} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              template={template} historyCycles={historyCycles} submissions={submissions}
              totalParticipants={totalParticipants} totalSubmissions={totalSubmissions}
              winnersPublished={winnersPublished}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              template={template} onEdit={openEdit}
              triggerAction={triggerAction} actionBusy={actionBusy}
              onDelete={deleteContest}
            />
          )}
        </div>
      </main>

      {viewingSub && (
        <div className="cm-drawer-overlay" onClick={() => setViewingSub(null)}>
          <div className="cm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cm-drawer__header">
              <h3 className="cm-drawer__title">Submission Details</h3>
              <button className="admin-dash__close-btn" onClick={() => setViewingSub(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cm-drawer__body">
              <div className="cm-drawer__participant">
                <div className="cm-drawer__avatar">{(viewingSub.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <p className="cm-drawer__name">{viewingSub.name}</p>
                  <p className="cm-drawer__sub">{viewingSub.email} {viewingSub.rollNumber ? ` · ${viewingSub.rollNumber}` : ''}</p>
                </div>
              </div>
              <div className="cm-drawer__section">
                <div className="cm-drawer__section-title">Entry Title</div>
                <div className="cm-drawer__answer-value">{viewingSub.title || <span className="cm-text-muted">No title</span>}</div>
              </div>
              {viewingSub.description && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Description</div>
                  <div className="cm-drawer__answer-value">{viewingSub.description}</div>
                </div>
              )}
              {viewingSub.files?.length > 0 && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Uploaded Files ({viewingSub.files.length})</div>
                  <div className="cm-drawer__files">
                    {viewingSub.files.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="cm-drawer__file">
                        {f.fieldType === 'image' ? (
                          <img src={f.url} alt={f.originalName} />
                        ) : (
                          <div className="cm-drawer__file-video">
                            {f.fieldType === 'video' ? <FileVideo size={28} /> : <FileText size={28} />}
                          </div>
                        )}
                        <div className="cm-drawer__file-meta">{f.originalName || f.fieldLabel}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {viewingSub.workLinks?.length > 0 && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">External Links</div>
                  {viewingSub.workLinks.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noreferrer" className="cm-row cm-text-muted" style={{ padding: '6px 0' }}>
                      <Link2 size={14} /> {l.title || l.url} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
              {viewingSub.customAnswers?.length > 0 && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Form Answers</div>
                  {viewingSub.customAnswers
                    .filter((a) => !['image', 'video', 'file', 'link'].includes(a.type))
                    .map((a, i) => (
                      <div key={i} className="cm-drawer__answer">
                        <div className="cm-drawer__answer-label">{a.label}</div>
                        <div className="cm-drawer__answer-value">{String(a.value || '—')}</div>
                      </div>
                    ))}
                </div>
              )}
              {(viewingSub.score || viewingSub.judgeFeedback) && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Judging</div>
                  <div className="cm-drawer__answer">
                    <div className="cm-drawer__answer-label">Score</div>
                    <div className="cm-drawer__answer-value">{viewingSub.score || 0} / 100</div>
                  </div>
                  {viewingSub.judgeFeedback && (
                    <div className="cm-drawer__answer">
                      <div className="cm-drawer__answer-label">Feedback</div>
                      <div className="cm-drawer__answer-value">{viewingSub.judgeFeedback}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="cm-drawer__footer">
              <button className="cm-btn" onClick={() => setViewingSub(null)}>Close</button>
              <button className="cm-btn cm-btn--primary" onClick={() => { const sub = viewingSub; setViewingSub(null); openJudging(sub); }}>
                <Edit3 size={14} /> Judge
              </button>
            </div>
          </div>
        </div>
      )}

      {judgingSub && (
        <div className="cm-drawer-overlay" onClick={() => !judgeSaving && setJudgingSub(null)}>
          <div className="cm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cm-drawer__header">
              <h3 className="cm-drawer__title">Judge — {judgingSub.name}</h3>
              <button className="admin-dash__close-btn" onClick={() => setJudgingSub(null)} disabled={judgeSaving}>
                <X size={18} />
              </button>
            </div>
            <div className="cm-drawer__body">
              <div className="cm-drawer__participant">
                <div className="cm-drawer__avatar">{(judgingSub.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <p className="cm-drawer__name">{judgingSub.name}</p>
                  <p className="cm-drawer__sub">{judgingSub.email} {judgingSub.rollNumber ? ` · ${judgingSub.rollNumber}` : ''}</p>
                </div>
              </div>
              {judgingSub.title && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Entry</div>
                  <div className="cm-drawer__answer-value">{judgingSub.title}</div>
                </div>
              )}
              {judgingSub.description && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Description</div>
                  <div className="cm-drawer__answer-value">{judgingSub.description}</div>
                </div>
              )}
              {judgingSub.files?.length > 0 && (
                <div className="cm-drawer__section">
                  <div className="cm-drawer__section-title">Files ({judgingSub.files.length})</div>
                  <div className="cm-drawer__files">
                    {judgingSub.files.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="cm-drawer__file">
                        {f.fieldType === 'image' ? (
                          <img src={f.url} alt={f.originalName} />
                        ) : (
                          <div className="cm-drawer__file-video">
                            {f.fieldType === 'video' ? <FileVideo size={28} /> : <FileText size={28} />}
                          </div>
                        )}
                        <div className="cm-drawer__file-meta">{f.originalName || f.fieldLabel}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="cm-drawer__section">
                <div className="cm-drawer__section-title">Score (0-100)</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="admin-dash__input"
                  value={judgeForm.score}
                  onChange={(e) => setJudgeForm({ ...judgeForm, score: parseInt(e.target.value, 10) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="cm-drawer__section">
                <div className="cm-drawer__section-title">Feedback</div>
                <textarea
                  rows={4}
                  className="admin-dash__input"
                  style={{ width: '100%', resize: 'vertical' }}
                  value={judgeForm.feedback}
                  onChange={(e) => setJudgeForm({ ...judgeForm, feedback: e.target.value })}
                  placeholder="Internal judge notes..."
                />
              </div>
            </div>
            <div className="cm-drawer__footer">
              <button className="cm-btn" onClick={() => setJudgingSub(null)} disabled={judgeSaving}>Cancel</button>
              <button className="cm-btn cm-btn--primary" disabled={judgeSaving} onClick={saveJudging}>
                <Save size={14} /> {judgeSaving ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && editForm && (
        <div className="admin-dash__overlay" onClick={() => !editSaving && setEditing(false)}>
          <div className="admin-dash__modal" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Edit Contest Template</h2>
              <button className="admin-dash__close-btn" onClick={() => setEditing(false)} disabled={editSaving}><X size={20} /></button>
            </div>
            <form onSubmit={saveEdit} className="admin-dash__modal-body">
              <div className="admin-dash__form-grid admin-dash__form-grid--3col">
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Title *</label>
                  <input type="text" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Description</label>
                  <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="admin-dash__field">
                  <label>Banner URL</label>
                  <input type="text" value={editForm.bannerUrl} onChange={(e) => setEditForm({ ...editForm, bannerUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div className="admin-dash__field">
                  <label>Tags (comma-separated)</label>
                  <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                </div>
                <div className="admin-dash__field">
                  <label>Visibility flags</label>
                  <div style={{ display: 'flex', gap: 14, paddingTop: 8, fontSize: '0.82rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <input type="checkbox" checked={editForm.featured} onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })} />
                      Featured
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <input type="checkbox" checked={editForm.isPublished} onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })} />
                      Published
                    </label>
                  </div>
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Rules</label>
                  <textarea rows={2} value={editForm.rules} onChange={(e) => setEditForm({ ...editForm, rules: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Eligibility</label>
                  <textarea rows={2} value={editForm.eligibility} onChange={(e) => setEditForm({ ...editForm, eligibility: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Prize Info</label>
                  <textarea rows={2} value={editForm.prizeInfo} onChange={(e) => setEditForm({ ...editForm, prizeInfo: e.target.value })} />
                </div>
                <div className="admin-dash__field admin-dash__field--full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ margin: 0 }}>Custom Form Fields</label>
                    <button type="button" className="admin-dash__save-btn" onClick={addField} style={{ padding: '6px 12px' }}>
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
                  <div className="admin-dash__fields-grid">
                    {editForm.customFields.map((field, idx) => (
                      <div key={idx} className="admin-dash__field-row">
                        <input type="text" className="admin-dash__input" placeholder="Field label" value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                        <select className="admin-dash__input" value={field.type} onChange={(e) => updateField(idx, { type: e.target.value })}>
                          <option value="text">Text</option>
                          <option value="textarea">Writeup</option>
                          <option value="number">Number</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="file">File</option>
                          <option value="link">Work Link</option>
                          <option value="select">Dropdown</option>
                        </select>
                        <label className="admin-dash__req-check">
                          <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(idx, { required: e.target.checked })} /> Req
                        </label>
                        {(field.type === 'image' || field.type === 'video' || field.type === 'file') && (
                          <label className="admin-dash__num-inline">MB <input type="number" min={1} max={1000} className="admin-dash__input" value={field.maxSizeMB || 10} onChange={(e) => updateField(idx, { maxSizeMB: parseInt(e.target.value, 10) || 10 })} /></label>
                        )}
                        {(field.type === 'image' || field.type === 'link') && (
                          <label className="admin-dash__num-inline">Count <input type="number" min={1} max={20} className="admin-dash__input" value={field.maxCount || 1} onChange={(e) => updateField(idx, { maxCount: parseInt(e.target.value, 10) || 1 })} /></label>
                        )}
                        <div className="admin-dash__field-actions">
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp size={13} /></button>
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveField(idx, 1)} disabled={idx === editForm.customFields.length - 1}><ChevronDown size={13} /></button>
                          <button type="button" className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => removeField(idx)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
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

      {winnersCycle && (
        <div className="admin-dash__overlay" onClick={() => !winnersSaving && setWinnersCycle(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
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
              ].map((r) => (
                <div key={r.key} className="admin-dash__field">
                  <label>{r.label}</label>
                  <select
                    className="admin-dash__input"
                    value={winnersDraft[r.key]}
                    onChange={(e) => setWinnersDraft({ ...winnersDraft, [r.key]: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {submissions.map((s) => (
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
                  onChange={(e) => setWinnersDraft({
                    ...winnersDraft,
                    mentions: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                  })}
                  placeholder="memberId1, memberId2"
                />
              </div>
              <div className="admin-dash__field admin-dash__field--full">
                <label>Judges' Announcement Notes</label>
                <textarea
                  rows={3}
                  value={winnersDraft.notes}
                  onChange={(e) => setWinnersDraft({ ...winnersDraft, notes: e.target.value })}
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
    </div>
  );
}
