'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trophy, Eye, Users, Edit3, Trash2, X, ExternalLink, 
  Copy, Archive, Play, Pause, Clock, Search, Tag, Sparkles, CheckCircle2, Shield, Calendar, AlertCircle
} from 'lucide-react';
import ModernDateTimePicker from '../../../src/components/ModernDateTimePicker';
import '../../../app/admin/dashboard/AdminDashboard.css';

const EMPTY_CONTEST_FORM = {
  title: '',
  slug: '',
  description: '',
  type: 'one_time',
  bannerUrl: '',
  rules: '',
  eligibility: 'Open to all KL University students.',
  submissionGuidelines: '',
  prizeInfo: '',
  tags: '',
  visibility: 'public',
  featured: false,
  isPublished: true,
  startDate: '',
  endDate: '',
  startDay: 0,
  startTime: '00:00',
  endDay: 6,
  endTime: '23:59',
  startDayOfMonth: 1,
  endDayOfMonth: 28,
  // Fully Custom Form Fields
  customFields: [
    { id: 'f_1', label: 'Project / Entry Title', type: 'text', required: true, placeholder: 'e.g. Smart Campus App' },
    { id: 'f_2', label: 'Detailed Description', type: 'textarea', required: false, placeholder: 'Explain what you built...' },
    { id: 'f_3', label: 'Poster / Image Upload', type: 'image', required: false, maxSizeMB: 10, maxCount: 3 },
    { id: 'f_4', label: 'Work Links (GitHub, Figma, Drive)', type: 'link', required: false, maxCount: 3 },
  ]
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ContestsSection({ contestsList = [], refreshData }) {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form states
  const [showContestForm, setShowContestForm] = useState(false);
  const [contestEditingSlug, setContestEditingSlug] = useState(null);
  const [contestForm, setContestForm] = useState(EMPTY_CONTEST_FORM);
  const [contestSaving, setContestSaving] = useState(false);

  // Judging & Winners states
  const [viewingJudgingCycle, setViewingJudgingCycle] = useState(null);
  const [judgingSubmissions, setJudgingSubmissions] = useState([]);
  const [declaringWinnersCycle, setDeclaringWinnersCycle] = useState(null);
  const [winnersList, setWinnersList] = useState([{ rank: 1, name: '', rollNumber: '', awardTitle: '', judgeNotes: '' }]);
  const [announcementNotesInput, setAnnouncementNotesInput] = useState('');

  // History Inspector state
  const [viewingHistoryContest, setViewingHistoryContest] = useState(null);
  const [historyCyclesList, setHistoryCyclesList] = useState([]);

  const [error, setError] = useState('');

  // Form Builder Field Handlers
  const handleAddCustomField = (type = 'text') => {
    const id = `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const defaults = {
      text: { label: 'Single Line Text', placeholder: 'Enter text...' },
      textarea: { label: 'Long Description / Writeup', placeholder: 'Enter detailed writeup...' },
      number: { label: 'Numeric Value', placeholder: '0' },
      image: { label: 'Image Submission', maxSizeMB: 10, maxCount: 3 },
      video: { label: 'Video Submission', maxSizeMB: 50, maxCount: 1 },
      file: { label: 'File Attachment (PDF / Zip / Doc)', maxSizeMB: 20 },
      link: { label: 'External Work Links', maxCount: 3 },
      select: { label: 'Option Select', options: ['Option 1', 'Option 2'] }
    };
    const newField = {
      id,
      label: defaults[type]?.label || 'Custom Question / Requirement',
      type,
      required: false,
      placeholder: defaults[type]?.placeholder || '',
      maxSizeMB: defaults[type]?.maxSizeMB || 10,
      maxCount: defaults[type]?.maxCount || 1,
      options: defaults[type]?.options || [],
    };
    setContestForm(prev => ({ ...prev, customFields: [...prev.customFields, newField] }));
  };

  const handleUpdateCustomField = (idx, patch) => {
    setContestForm(prev => {
      const next = [...prev.customFields];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, customFields: next };
    });
  };

  const handleRemoveCustomField = (idx) => {
    setContestForm(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveCustomField = (idx, dir) => {
    setContestForm(prev => {
      const next = [...prev.customFields];
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return { ...prev, customFields: next };
    });
  };

  // ── Filter pipeline ──────────────────────────────
  let filteredList = contestsList.slice();
  if (statusFilter === 'published') filteredList = filteredList.filter(c => c.isPublished && !c.isArchived);
  if (statusFilter === 'draft') filteredList = filteredList.filter(c => !c.isPublished);
  if (statusFilter === 'paused') filteredList = filteredList.filter(c => c.isPaused);
  if (statusFilter === 'archived') filteredList = filteredList.filter(c => c.isArchived);
  if (typeFilter !== 'all') filteredList = filteredList.filter(c => c.type === typeFilter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filteredList = filteredList.filter(c => 
      (c.title || '').toLowerCase().includes(q) ||
      (c.slug || '').toLowerCase().includes(q)
    );
  }

  // Save / Create Contest Form
  const saveContestForm = async (e) => {
    e.preventDefault();
    setContestSaving(true);
    setError('');

    const payload = {
      ...contestForm,
      tags: typeof contestForm.tags === 'string' ? contestForm.tags.split(',').map(t => t.trim()).filter(Boolean) : contestForm.tags,
      schedule: {
        startDate: contestForm.startDate || null,
        endDate: contestForm.endDate || null,
        startDay: parseInt(contestForm.startDay, 10),
        startTime: contestForm.startTime,
        endDay: parseInt(contestForm.endDay, 10),
        endTime: contestForm.endTime,
        startDayOfMonth: parseInt(contestForm.startDayOfMonth, 10),
        endDayOfMonth: parseInt(contestForm.endDayOfMonth, 10),
      },
      customFields: contestForm.customFields || [],
    };

    try {
      const isEdit = !!contestEditingSlug;
      const url = isEdit ? `/api/contests/${contestEditingSlug}` : '/api/contests';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save contest');
      setShowContestForm(false);
      setContestForm(EMPTY_CONTEST_FORM);
      setContestEditingSlug(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setContestSaving(false);
    }
  };

  const openEditContest = (c) => {
    setContestEditingSlug(c.slug);
    setContestForm({
      title: c.title || '',
      slug: c.slug || '',
      description: c.description || '',
      type: c.type || 'one_time',
      bannerUrl: c.bannerUrl || '',
      rules: c.rules || '',
      eligibility: c.eligibility || '',
      submissionGuidelines: c.submissionGuidelines || '',
      prizeInfo: c.prizeInfo || '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
      visibility: c.visibility || 'public',
      featured: !!c.featured,
      isPublished: c.isPublished !== false,
      startDate: c.schedule?.startDate ? new Date(c.schedule.startDate).toISOString().slice(0, 16) : '',
      endDate: c.schedule?.endDate ? new Date(c.schedule.endDate).toISOString().slice(0, 16) : '',
      startDay: c.schedule?.startDay ?? 0,
      startTime: c.schedule?.startTime || '00:00',
      endDay: c.schedule?.endDay ?? 6,
      endTime: c.schedule?.endTime || '23:59',
      startDayOfMonth: c.schedule?.startDayOfMonth ?? 1,
      endDayOfMonth: c.schedule?.endDayOfMonth ?? 28,
      customFields: Array.isArray(c.customFields) && c.customFields.length > 0 ? c.customFields : EMPTY_CONTEST_FORM.customFields,
    });
    setShowContestForm(true);
  };

  const triggerAction = async (slug, action, extra = {}) => {
    try {
      const res = await fetch(`/api/contests/${slug}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok && refreshData) refreshData();
    } catch (err) { setError(err.message); }
  };

  const deleteContest = async (slug) => {
    if (!confirm(`Delete contest template "${slug}" and all associated cycles/submissions permanently?`)) return;
    try {
      await fetch(`/api/contests/${slug}`, { method: 'DELETE' });
      if (refreshData) refreshData();
    } catch (err) { setError(err.message); }
  };

  const openJudgingModal = async (slug, cycle) => {
    try {
      setViewingJudgingCycle(cycle);
      const res = await fetch(`/api/contests/${slug}/results?cycle=${cycle.cycleNumber}`);
      if (res.ok) {
        const data = await res.json();
        setJudgingSubmissions(data.submissions || []);
      }
    } catch (err) { setError(err.message); }
  };

  const openDeclareWinnersModal = (slug, cycle) => {
    setDeclaringWinnersCycle({ slug, cycle });
    setAnnouncementNotesInput(cycle.announcementNotes || '');
    if (Array.isArray(cycle.winners) && cycle.winners.length > 0) {
      setWinnersList(cycle.winners);
    } else {
      setWinnersList([
        { rank: 1, name: '', rollNumber: '', memberId: '', awardTitle: '🥇 1st Place Winner', judgeNotes: '' },
        { rank: 2, name: '', rollNumber: '', memberId: '', awardTitle: '🥈 2nd Place Winner', judgeNotes: '' },
        { rank: 3, name: '', rollNumber: '', memberId: '', awardTitle: '🥉 3rd Place Winner', judgeNotes: '' },
      ]);
    }
  };

  const saveResults = async () => {
    if (!declaringWinnersCycle) return;
    try {
      await fetch(`/api/contests/${declaringWinnersCycle.slug}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: declaringWinnersCycle.cycle._id,
          winners: winnersList.filter(w => w.name.trim()),
          announcementNotes: announcementNotesInput,
          status: 'results_published',
        }),
      });

      setDeclaringWinnersCycle(null);
      if (refreshData) refreshData();
    } catch (err) { setError(err.message); }
  };

  const openHistoryInspector = async (slug) => {
    try {
      const res = await fetch(`/api/contests/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setViewingHistoryContest(data.template);
        setHistoryCyclesList(data.historyCycles || []);
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="admin-section">
      <div className="admin-dash__title-row">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Contest Management Studio</h2>
          <p className="admin-section__subtitle">{contestsList.length} contest template{contestsList.length !== 1 ? 's' : ''} &middot; Recurring schedules, judging & winner archives</p>
        </div>
        <button className="admin-dash__save-btn" onClick={() => { setContestEditingSlug(null); setContestForm(EMPTY_CONTEST_FORM); setShowContestForm(true); }}>
          <Plus size={15} /> Create Contest
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="admin-media__toolbar" style={{ marginBottom: 20 }}>
        <div className="admin-media__toolbar-left">
          <div className="admin-media__search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search title or slug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-dash__select">
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="admin-dash__select">
            <option value="all">All Frequency Types</option>
            <option value="one_time">One-Time Contest</option>
            <option value="immediate">Immediate Deadline</option>
            <option value="recurring_weekly">Weekly Recurring</option>
            <option value="recurring_monthly">Monthly Recurring</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="admin-dash__table-wrap">
        <table className="admin-dash__table">
          <thead>
            <tr>
              <th>Contest Template</th>
              <th>Type / Schedule</th>
              <th>Active Cycle</th>
              <th>Participants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
                  No contests found matching filters. Click "Create Contest" to get started.
                </td>
              </tr>
            ) : (
              filteredList.map(c => {
                const cycle = c.activeCycle;
                return (
                  <tr key={c._id}>
                    <td>
                      <div className="admin-dash__user-cell">
                        {c.bannerUrl ? (
                          <img className="admin-dash__avatar" src={c.bannerUrl} alt={c.title} style={{ borderRadius: 8, width: 44, height: 44, objectFit: 'cover' }} />
                        ) : (
                          <div className="admin-dash__avatar admin-dash__avatar--fallback"><Trophy size={18} /></div>
                        )}
                        <div>
                          <div className="admin-dash__name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.title}
                            {c.featured && <span style={{ background: 'rgba(255,216,107,0.15)', color: '#ffd86b', fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>FEATURED</span>}
                            {!c.isPublished && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4 }}>DRAFT</span>}
                          </div>
                          <div className="admin-dash__email">
                            /contests/{c.slug} {c.isPaused && <span style={{ color: '#ffb44d' }}>(PAUSED)</span>} {c.isArchived && <span style={{ color: '#ff6b6b' }}>(ARCHIVED)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-rec-year-badge">{c.type.replace('_', ' ').toUpperCase()}</span>
                    </td>
                    <td>
                      {cycle ? (
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#71C4FF' }}>{cycle.cycleLabel}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                            {new Date(cycle.startTime).toLocaleDateString()} - {new Date(cycle.endTime).toLocaleDateString()}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <strong>{cycle?.participantCount || 0}</strong> entries
                    </td>
                    <td>
                      {cycle ? (
                        <span className={`admin-rec-status-indicator admin-rec-status-indicator--${cycle.status === 'active' ? 'open' : 'closed'}`}>
                          {cycle.status.toUpperCase()}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="admin-dash__title-actions">
                        <button className="admin-dash__icon-btn" title="View Public Page" onClick={() => router.push(`/contests/${c.slug}`)}><Eye size={15} /></button>
                        <button className="admin-dash__icon-btn" title="Cycle History" onClick={() => openHistoryInspector(c.slug)}><Calendar size={15} /></button>
                        {cycle && (
                          <button className="admin-dash__icon-btn" title="Submissions & Judging" onClick={() => openJudgingModal(c.slug, cycle)}><Users size={15} /></button>
                        )}
                        {cycle && (
                          <button className="admin-dash__icon-btn" title="Declare Winners" onClick={() => openDeclareWinnersModal(c.slug, cycle)}><Trophy size={15} style={{ color: '#f59e0b' }} /></button>
                        )}
                        <button className="admin-dash__icon-btn" title="Extend Deadline (+24h)" onClick={() => triggerAction(c.slug, 'extend_deadline', { hours: 24 })}><Clock size={15} style={{ color: '#71C4FF' }} /></button>
                        <button className="admin-dash__icon-btn" title="Duplicate Contest" onClick={() => triggerAction(c.slug, 'duplicate')}><Copy size={15} /></button>
                        <button className="admin-dash__icon-btn" title={c.isPublished ? 'Unpublish' : 'Publish'} onClick={() => triggerAction(c.slug, c.isPublished ? 'unpublish' : 'publish')}>
                          {c.isPublished ? '👁️' : '🔒'}
                        </button>
                        <button className="admin-dash__icon-btn" title={c.isPaused ? 'Resume' : 'Pause'} onClick={() => triggerAction(c.slug, c.isPaused ? 'resume' : 'pause')}>
                          {c.isPaused ? <Play size={15} style={{ color: '#5cdb95' }} /> : <Pause size={15} style={{ color: '#ffb44d' }} />}
                        </button>
                        <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" title="Edit Template" onClick={() => openEditContest(c)}><Edit3 size={15} /></button>
                        <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" title="Delete Contest" onClick={() => deleteContest(c.slug)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Contest Create / Edit Modal */}
      {showContestForm && (
        <div className="admin-dash__overlay" onClick={() => setShowContestForm(false)}>
          <div className="admin-dash__modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>{contestEditingSlug ? 'Edit Contest Template' : 'Create New Contest'}</h2>
              <button className="admin-dash__close-btn" onClick={() => setShowContestForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={saveContestForm} className="admin-dash__modal-body">
              <div className="admin-dash__form-grid">
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Title *</label>
                  <input type="text" required value={contestForm.title} onChange={e => setContestForm({ ...contestForm, title: e.target.value })} placeholder="Photography Challenge 2026" />
                </div>
                <div className="admin-dash__field">
                  <label>Permanent Slug (URL)</label>
                  <input type="text" value={contestForm.slug} onChange={e => setContestForm({ ...contestForm, slug: e.target.value })} placeholder="photography (leave blank to auto-generate)" />
                </div>
                <div className="admin-dash__field">
                  <label>Contest Type / Frequency *</label>
                  <select value={contestForm.type} onChange={e => setContestForm({ ...contestForm, type: e.target.value })} className="admin-dash__input">
                    <option value="one_time">One-Time Contest</option>
                    <option value="immediate">Immediate Contest with Deadline</option>
                    <option value="recurring_weekly">Weekly Recurring Contest</option>
                    <option value="recurring_monthly">Monthly Recurring Contest</option>
                  </select>
                </div>

                {/* Schedule Parameters */}
                {contestForm.type === 'one_time' && (
                  <>
                    <div className="admin-dash__field">
                      <label>Start Date & Time</label>
                      <ModernDateTimePicker
                        value={contestForm.startDate}
                        onChange={val => setContestForm({ ...contestForm, startDate: val })}
                        placeholder="Select start date & time"
                      />
                    </div>
                    <div className="admin-dash__field">
                      <label>End Date & Time</label>
                      <ModernDateTimePicker
                        value={contestForm.endDate}
                        onChange={val => setContestForm({ ...contestForm, endDate: val })}
                        placeholder="Select end date & time"
                      />
                    </div>
                  </>
                )}

                {contestForm.type === 'immediate' && (
                  <div className="admin-dash__field admin-dash__field--full">
                    <label>Submission Deadline Date & Time *</label>
                    <ModernDateTimePicker
                      value={contestForm.endDate}
                      onChange={val => setContestForm({ ...contestForm, endDate: val })}
                      placeholder="Select deadline date & time"
                    />
                  </div>
                )}

                {contestForm.type === 'recurring_weekly' && (
                  <>
                    <div className="admin-dash__field">
                      <label>Opens Every (Start Day)</label>
                      <select value={contestForm.startDay} onChange={e => setContestForm({ ...contestForm, startDay: e.target.value })} className="admin-dash__input">
                        {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div className="admin-dash__field">
                      <label>Opens At (Start Time)</label>
                      <input type="time" value={contestForm.startTime} onChange={e => setContestForm({ ...contestForm, startTime: e.target.value })} className="admin-dash__input" />
                    </div>
                    <div className="admin-dash__field">
                      <label>Closes Every (End Day)</label>
                      <select value={contestForm.endDay} onChange={e => setContestForm({ ...contestForm, endDay: e.target.value })} className="admin-dash__input">
                        {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div className="admin-dash__field">
                      <label>Closes At (End Time)</label>
                      <input type="time" value={contestForm.endTime} onChange={e => setContestForm({ ...contestForm, endTime: e.target.value })} className="admin-dash__input" />
                    </div>
                  </>
                )}

                {contestForm.type === 'recurring_monthly' && (
                  <>
                    <div className="admin-dash__field">
                      <label>Opens Day of Month (1-28)</label>
                      <input type="number" min={1} max={28} value={contestForm.startDayOfMonth} onChange={e => setContestForm({ ...contestForm, startDayOfMonth: e.target.value })} className="admin-dash__input" />
                    </div>
                    <div className="admin-dash__field">
                      <label>Closes Day of Month (1-28)</label>
                      <input type="number" min={1} max={28} value={contestForm.endDayOfMonth} onChange={e => setContestForm({ ...contestForm, endDayOfMonth: e.target.value })} className="admin-dash__input" />
                    </div>
                  </>
                )}

                <div className="admin-dash__field admin-dash__field--full">
                  <label>Banner Image URL</label>
                  <input type="url" value={contestForm.bannerUrl} onChange={e => setContestForm({ ...contestForm, bannerUrl: e.target.value })} placeholder="https://..." />
                </div>

                <div className="admin-dash__field admin-dash__field--full">
                  <label>Description</label>
                  <textarea rows={2} value={contestForm.description} onChange={e => setContestForm({ ...contestForm, description: e.target.value })} />
                </div>

                <div className="admin-dash__field admin-dash__field--full">
                  <label>Rules & Guidelines</label>
                  <textarea rows={3} value={contestForm.rules} onChange={e => setContestForm({ ...contestForm, rules: e.target.value })} />
                </div>

                <div className="admin-dash__field admin-dash__field--full">
                  <label>Prize Information</label>
                  <input type="text" value={contestForm.prizeInfo} onChange={e => setContestForm({ ...contestForm, prizeInfo: e.target.value })} placeholder="1st Place: 500 Pts + Certificate" />
                </div>

                <div className="admin-dash__field admin-dash__field--full">
                  <label>Tags / Categories (comma separated)</label>
                  <input type="text" value={contestForm.tags} onChange={e => setContestForm({ ...contestForm, tags: e.target.value })} placeholder="photography, design, weekly" />
                </div>

                {/* Full Custom Form Builder */}
                <div className="admin-dash__field admin-dash__field--full" style={{ background: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#71C4FF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} /> Custom Submission Form Builder
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>Add, remove, reorder, or customize any field type & size limits required for this contest.</p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="admin-dash__icon-btn" title="Add Text Input" onClick={() => handleAddCustomField('text')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> Text</button>
                      <button type="button" className="admin-dash__icon-btn" title="Add Paragraph" onClick={() => handleAddCustomField('textarea')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> Writeup</button>
                      <button type="button" className="admin-dash__icon-btn" title="Add Image Field" onClick={() => handleAddCustomField('image')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> Image</button>
                      <button type="button" className="admin-dash__icon-btn" title="Add Video Field" onClick={() => handleAddCustomField('video')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> Video</button>
                      <button type="button" className="admin-dash__icon-btn" title="Add File Field" onClick={() => handleAddCustomField('file')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> File</button>
                      <button type="button" className="admin-dash__icon-btn" title="Add Link Field" onClick={() => handleAddCustomField('link')} style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}><Plus size={12} /> Link</button>
                    </div>
                  </div>

                  {contestForm.customFields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      No fields configured. Participants can submit entries with 0 required inputs. Use buttons above to add fields.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {contestForm.customFields.map((field, idx) => (
                        <div key={field.id || idx} style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px auto', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              className="admin-dash__input"
                              placeholder="Field Title / Question Label"
                              value={field.label}
                              onChange={e => handleUpdateCustomField(idx, { label: e.target.value })}
                            />
                            <select
                              className="admin-dash__input"
                              value={field.type}
                              onChange={e => handleUpdateCustomField(idx, { type: e.target.value })}
                            >
                              <option value="text">Text (Single Line)</option>
                              <option value="textarea">Writeup (Multi-line)</option>
                              <option value="number">Number</option>
                              <option value="image">Image Upload / URL</option>
                              <option value="video">Video Upload / URL</option>
                              <option value="file">File (PDF/Zip)</option>
                              <option value="link">Work Link(s)</option>
                              <option value="select">Dropdown Select</option>
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => handleUpdateCustomField(idx, { required: e.target.checked })}
                              />
                              Required
                            </label>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button type="button" className="admin-dash__icon-btn" onClick={() => handleMoveCustomField(idx, -1)} disabled={idx === 0}>↑</button>
                              <button type="button" className="admin-dash__icon-btn" onClick={() => handleMoveCustomField(idx, 1)} disabled={idx === contestForm.customFields.length - 1}>↓</button>
                              <button type="button" className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleRemoveCustomField(idx)}><Trash2 size={13} /></button>
                            </div>
                          </div>

                          {/* Extra Size / Limits Row based on Type */}
                          {(field.type === 'image' || field.type === 'video' || field.type === 'file' || field.type === 'link') && (
                            <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
                              {(field.type === 'image' || field.type === 'video' || field.type === 'file') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>Max File Size (MB):</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    style={{ width: '80px' }}
                                    className="admin-dash__input"
                                    value={field.maxSizeMB || 10}
                                    onChange={e => handleUpdateCustomField(idx, { maxSizeMB: parseInt(e.target.value, 10) || 10 })}
                                  />
                                </div>
                              )}
                              {(field.type === 'image' || field.type === 'link') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>Max Items Count:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    style={{ width: '70px' }}
                                    className="admin-dash__input"
                                    value={field.maxCount || 1}
                                    onChange={e => handleUpdateCustomField(idx, { maxCount: parseInt(e.target.value, 10) || 1 })}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-dash__field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <input type="checkbox" id="featured" checked={contestForm.featured} onChange={e => setContestForm({ ...contestForm, featured: e.target.checked })} />
                  <label htmlFor="featured" style={{ margin: 0 }}>Featured Contest (Show Spotlight Card)</label>
                </div>

                <div className="admin-dash__field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <input type="checkbox" id="published" checked={contestForm.isPublished} onChange={e => setContestForm({ ...contestForm, isPublished: e.target.checked })} />
                  <label htmlFor="published" style={{ margin: 0 }}>Published (Visible Publicly)</label>
                </div>
              </div>

              {error && <p style={{ color: '#ff6b6b', margin: '12px 0 0', fontSize: '0.88rem' }}>{error}</p>}

              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowContestForm(false)}>Cancel</button>
                <button type="submit" className="admin-dash__save-btn" disabled={contestSaving}>
                  {contestSaving ? 'Saving...' : 'Save Contest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History & Cycles Inspector Modal */}
      {viewingHistoryContest && (
        <div className="admin-dash__overlay" onClick={() => setViewingHistoryContest(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Contest History & Cycles — {viewingHistoryContest.title}</h2>
              <button className="admin-dash__close-btn" onClick={() => setViewingHistoryContest(null)}><X size={20} /></button>
            </div>

            <div className="admin-dash__modal-body">
              {historyCyclesList.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.4)' }}>No cycle history recorded yet.</p>
              ) : (
                <div className="admin-dash__table-wrap">
                  <table className="admin-dash__table">
                    <thead>
                      <tr>
                        <th>Cycle</th>
                        <th>Dates</th>
                        <th>Participants</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyCyclesList.map((cy) => (
                        <tr key={cy._id}>
                          <td><strong>{cy.cycleLabel}</strong></td>
                          <td style={{ fontSize: '0.78rem' }}>
                            {new Date(cy.startTime).toLocaleDateString()} - {new Date(cy.endTime).toLocaleDateString()}
                          </td>
                          <td>{cy.participantCount || 0} entries</td>
                          <td>
                            <span className={`admin-rec-status-indicator admin-rec-status-indicator--${cy.status === 'active' ? 'open' : 'closed'}`}>
                              {cy.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <button className="admin-dash__icon-btn" title="View Submissions" onClick={() => { setViewingHistoryContest(null); openJudgingModal(viewingHistoryContest.slug, cy); }}>
                              <Users size={14} /> Submissions
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submissions & Judging Modal */}
      {viewingJudgingCycle && (
        <div className="admin-dash__overlay" onClick={() => setViewingJudgingCycle(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Submissions & Judging — {viewingJudgingCycle.cycleLabel}</h2>
              <button className="admin-dash__close-btn" onClick={() => setViewingJudgingCycle(null)}><X size={20} /></button>
            </div>

            <div className="admin-dash__modal-body">
              {judgingSubmissions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.4)' }}>No candidate submissions for this cycle yet.</p>
              ) : (
                <div className="admin-dash__table-wrap">
                  <table className="admin-dash__table">
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Submitted Responses</th>
                        <th>Work Links & Media</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judgingSubmissions.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <strong>{s.name}</strong>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{s.rollNumber || s.email}</div>
                          </td>
                          <td>
                            <strong style={{ color: '#71C4FF' }}>{s.title}</strong>
                            {s.description && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{s.description}</div>}
                            {Array.isArray(s.customAnswers) && s.customAnswers.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {s.customAnswers.map((ca, idx) => (
                                  <div key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
                                    <strong style={{ color: '#ffd86b' }}>{ca.label}:</strong> {typeof ca.value === 'object' ? JSON.stringify(ca.value) : String(ca.value || '—')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            {s.fileUrl && (
                              <a href={s.fileUrl} target="_blank" rel="noreferrer" className="admin-rec-link-pill" style={{ marginRight: 4, marginBottom: 4 }}>
                                <ExternalLink size={11} /> File Attachment
                              </a>
                            )}
                            {Array.isArray(s.workLinks) && s.workLinks.map((l, i) => (
                              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="admin-rec-link-pill" style={{ marginRight: 4, marginBottom: 4 }}>
                                <ExternalLink size={11} /> {l.title}
                              </a>
                            ))}
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>{new Date(s.submittedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Declare Winners Studio Modal */}
      {declaringWinnersCycle && (
        <div className="admin-dash__overlay" onClick={() => setDeclaringWinnersCycle(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Declare Winners — {declaringWinnersCycle.cycle.cycleLabel}</h2>
              <button className="admin-dash__close-btn" onClick={() => setDeclaringWinnersCycle(null)}><X size={20} /></button>
            </div>

            <div className="admin-dash__modal-body">
              <div className="admin-dash__field">
                <label>Judges' Announcement Notes</label>
                <textarea
                  rows={2}
                  value={announcementNotesInput}
                  onChange={e => setAnnouncementNotesInput(e.target.value)}
                  placeholder="Congratulations to all participants! Here are the winners for this cycle..."
                />
              </div>

              <div className="admin-dash__field">
                <label>Winners List</label>
                {winnersList.map((win, idx) => (
                  <div key={idx} className="join-link-row" style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
                    <select
                      value={win.rank}
                      onChange={e => {
                        const next = [...winnersList];
                        next[idx].rank = parseInt(e.target.value, 10);
                        setWinnersList(next);
                      }}
                      className="admin-dash__input"
                      style={{ width: '110px' }}
                    >
                      <option value={1}>🥇 1st</option>
                      <option value={2}>🥈 2nd</option>
                      <option value={3}>🥉 3rd</option>
                      <option value={99}>⭐ Special</option>
                    </select>
                    <input
                      type="text"
                      className="admin-dash__input"
                      placeholder="Winner Name"
                      value={win.name}
                      onChange={e => {
                        const next = [...winnersList];
                        next[idx].name = e.target.value;
                        setWinnersList(next);
                      }}
                    />
                    <input
                      type="text"
                      className="admin-dash__input"
                      placeholder="Award Title (e.g. 1st Place)"
                      value={win.awardTitle}
                      onChange={e => {
                        const next = [...winnersList];
                        next[idx].awardTitle = e.target.value;
                        setWinnersList(next);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setDeclaringWinnersCycle(null)}>Cancel</button>
                <button type="button" className="admin-dash__save-btn" onClick={saveResults}>
                  <Trophy size={14} /> Publish Results & Winners
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
