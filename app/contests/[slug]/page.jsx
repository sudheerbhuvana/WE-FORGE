'use client';

import React, { useState, useEffect, use } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Trophy, Clock, Calendar, Users, Award, ShieldCheck, CheckCircle2, Plus, Trash2, 
  ExternalLink, FileText, Send, Lock, Zap, History, Sparkles, AlertCircle, Eye, ArrowRight,
  Image as ImageIcon, Video as VideoIcon, FileIcon, Upload, X
} from 'lucide-react';
import BackButton from '../../../src/components/BackButton';
import Footer from '../../../src/components/Footer';
import './page.css';

export default function SingleContestPage({ params }) {
  const { slug } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCycleNum = searchParams.get('cycle');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview | submit | rules | winners | history

  const [template, setTemplate] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [targetCycle, setTargetCycle] = useState(null);
  const [historyCycles, setHistoryCycles] = useState([]);
  const [userSubmission, setUserSubmission] = useState(null);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subFileUrl, setSubFileUrl] = useState('');
  const [subLinks, setSubLinks] = useState([{ title: 'Project / GitHub Link', url: '' }]);
  const [formAnswers, setFormAnswers] = useState({});

  // Per-field uploaded files keyed by fieldId.
  // Each value is an array of File objects (queued for upload).
  // `uploadedFiles` holds files that are already on the server from a prior submission
  // (so the user can review/edit and resubmit without re-uploading).
  const [filesByField, setFilesByField] = useState({}); // { fieldId: [File, ...] }
  const [uploadedFiles, setUploadedFiles] = useState({}); // { fieldId: [{ url, s3Key, originalName, fileSize, mimeType }, ...] }
  const [fileErrors, setFileErrors] = useState({}); // { fieldId: 'message' }

  useEffect(() => {
    window.scrollTo(0, 0);
    loadContestData();
  }, [slug, requestedCycleNum, authStatus]);

  const loadContestData = async () => {
    setLoading(true);
    try {
      const cycleQuery = requestedCycleNum ? `?cycle=${requestedCycleNum}` : '';
      const res = await fetch(`/api/contests/${slug}${cycleQuery}`);
      if (!res.ok) {
        throw new Error('Contest not found');
      }

      const data = await res.json();
      setTemplate(data.template);
      setActiveCycle(data.activeCycle);
      setTargetCycle(data.targetCycle);
      setHistoryCycles(data.historyCycles || []);

      // If user is logged in, fetch their submission for the target cycle
      if (authStatus === 'authenticated' && data.targetCycle) {
        const subRes = await fetch(`/api/contests/${slug}/submit?cycle=${data.targetCycle.cycleNumber}`);
        if (subRes.ok) {
          const sData = await subRes.json();
          if (sData.submission) {
            setUserSubmission(sData.submission);
            setSubTitle(sData.submission.title || '');
            setSubDesc(sData.submission.description || '');
            setSubFileUrl(sData.submission.fileUrl || '');
            if (Array.isArray(sData.submission.workLinks) && sData.submission.workLinks.length > 0) {
              setSubLinks(sData.submission.workLinks);
            }
            if (Array.isArray(sData.submission.customAnswers)) {
              const map = {};
              sData.submission.customAnswers.forEach(ca => { map[ca.fieldId] = ca.value; });
              setFormAnswers(map);
            }

            // Group existing uploaded files by fieldId for display
            if (Array.isArray(sData.submission.files)) {
              const grouped = {};
              sData.submission.files.forEach(f => {
                if (!grouped[f.fieldId]) grouped[f.fieldId] = [];
                grouped[f.fieldId].push(f);
              });
              setUploadedFiles(grouped);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (subLinks.length >= 5) return;
    setSubLinks([...subLinks, { title: '', url: '' }]);
  };

  const handleRemoveLink = (idx) => {
    setSubLinks(subLinks.filter((_, i) => i !== idx));
  };

  const handleLinkChange = (idx, field, val) => {
    const next = [...subLinks];
    next[idx][field] = val;
    setSubLinks(next);
  };

  // File-queue helpers for image / video / file fields
  const handleAddFiles = (fieldId, fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    const customFields = template?.customFields || [];
    const fieldDef = customFields.find(f => f.id === fieldId);
    if (!fieldDef) return;

    const maxCount = fieldDef.maxCount || 999;
    const maxBytes = (fieldDef.maxSizeMB || 25) * 1024 * 1024;
    const queued = filesByField[fieldId] || [];
    const alreadyUploaded = uploadedFiles[fieldId] || [];
    const remainingSlots = Math.max(0, maxCount - alreadyUploaded.length - queued.length);

    const accepted = [];
    let err = '';
    for (const file of incoming) {
      if (accepted.length >= remainingSlots) {
        err = `Limit is ${maxCount} file(s) for "${fieldDef.label}".`;
        break;
      }
      if (file.size > maxBytes) {
        err = `"${file.name}" exceeds the ${fieldDef.maxSizeMB} MB limit.`;
        break;
      }
      if (fieldDef.type === 'image' && !file.type.startsWith('image/')) {
        err = `"${file.name}" is not an image.`;
        break;
      }
      if (fieldDef.type === 'video' && !file.type.startsWith('video/')) {
        err = `"${file.name}" is not a video.`;
        break;
      }
      accepted.push(file);
    }

    setFilesByField(prev => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), ...accepted],
    }));
    setFileErrors(prev => ({ ...prev, [fieldId]: err }));
  };

  const handleRemoveQueuedFile = (fieldId, idx) => {
    setFilesByField(prev => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveUploadedFile = (fieldId, idx) => {
    // Mark as "removed" — easiest UX is to remove from the local map so it
    // doesn't display; on next submit the server keeps it (merge logic only
    // replaces fields that have new files). To truly delete from server we'd
    // need a dedicated endpoint — for now this gives the user a clean UI.
    setUploadedFiles(prev => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((_, i) => i !== idx),
    }));
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileField = (field) => {
    const queued = filesByField[field.id] || [];
    const existing = uploadedFiles[field.id] || [];
    const totalCount = queued.length + existing.length;
    const maxCount = field.maxCount || 999;
    const maxMB = field.maxSizeMB || 25;
    const atCapacity = totalCount >= maxCount;
    const Icon = field.type === 'image' ? ImageIcon : field.type === 'video' ? VideoIcon : FileIcon;
    const accept = field.type === 'image' ? 'image/*' : field.type === 'video' ? 'video/*' : '*/*';

    return (
      <div className="sc-file-field">
        <div className="sc-file-field__header">
          <span className="sc-file-field__count">
            {totalCount} / {maxCount} file{totalCount === 1 ? '' : 's'}
          </span>
          <span className="sc-file-field__limit">≤ {maxMB} MB each</span>
        </div>

        {!atCapacity && (
          <label className="sc-file-drop">
            <input
              type="file"
              accept={accept}
              multiple={maxCount > 1}
              style={{ display: 'none' }}
              onChange={(e) => {
                handleAddFiles(field.id, e.target.files);
                e.target.value = '';
              }}
            />
            <div className="sc-file-drop__inner">
              <Upload size={20} />
              <span>Click to upload {field.type === 'image' ? 'image' : field.type === 'video' ? 'video' : 'file'}{maxCount > 1 ? 's' : ''}</span>
              <small>{accept === '*/*' ? 'Any file type' : `${accept} only`}</small>
            </div>
          </label>
        )}

        {fileErrors[field.id] && (
          <div className="sc-file-error">{fileErrors[field.id]}</div>
        )}

        {existing.length > 0 && (
          <ul className="sc-file-list">
            {existing.map((f, i) => (
              <li key={`ex-${i}`} className="sc-file-row sc-file-row--uploaded">
                {field.type === 'image' && f.url ? (
                  <img src={f.url} alt={f.originalName} className="sc-file-thumb" />
                ) : field.type === 'video' ? (
                  <video src={f.url} className="sc-file-thumb" muted />
                ) : (
                  <div className="sc-file-thumb sc-file-thumb--icon"><Icon size={18} /></div>
                )}
                <div className="sc-file-row__meta">
                  <a href={f.url} target="_blank" rel="noreferrer" className="sc-file-row__name">{f.originalName || 'View file'}</a>
                  <span className="sc-file-row__size">{formatBytes(f.fileSize)}</span>
                </div>
                <button
                  type="button"
                  className="sc-file-row__remove"
                  onClick={() => handleRemoveUploadedFile(field.id, i)}
                  title="Remove from view"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {queued.length > 0 && (
          <ul className="sc-file-list">
            {queued.map((file, i) => (
              <li key={`q-${i}`} className="sc-file-row sc-file-row--queued">
                <div className="sc-file-thumb sc-file-thumb--icon"><Icon size={18} /></div>
                <div className="sc-file-row__meta">
                  <span className="sc-file-row__name">{file.name}</span>
                  <span className="sc-file-row__size">{formatBytes(file.size)}</span>
                </div>
                <span className="sc-file-row__status">Queued</span>
                <button
                  type="button"
                  className="sc-file-row__remove"
                  onClick={() => handleRemoveQueuedFile(field.id, i)}
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const customFields = template?.customFields || [];
    const customAnswers = customFields.map(field => ({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      value: formAnswers[field.id] !== undefined ? formAnswers[field.id] : '',
    }));

    // Pre-flight validation: count + size for any newly-added files
    for (const f of customFields) {
      if (f.type !== 'image' && f.type !== 'video' && f.type !== 'file') continue;
      const queued = filesByField[f.id] || [];
      const existing = uploadedFiles[f.id] || [];
      const totalCount = queued.length + existing.length;
      if (totalCount > (f.maxCount || 999)) {
        setError(`Too many files for "${f.label}". Limit is ${f.maxCount}.`);
        return;
      }
      for (const file of queued) {
        const maxMB = f.maxSizeMB || 25;
        if (file.size > maxMB * 1024 * 1024) {
          setError(`"${file.name}" exceeds ${maxMB} MB limit for "${f.label}".`);
          return;
        }
        if (f.type === 'image' && !file.type.startsWith('image/')) {
          setError(`"${file.name}" is not an image.`);
          return;
        }
        if (f.type === 'video' && !file.type.startsWith('video/')) {
          setError(`"${file.name}" is not a video.`);
          return;
        }
      }
    }

    // Build multipart form
    const formData = new FormData();
    formData.append('title', subTitle || (customAnswers.find(a => a.value && typeof a.value === 'string')?.value) || 'Contest Entry');
    formData.append('description', subDesc);
    formData.append('fileUrl', subFileUrl);
    formData.append('customAnswers', JSON.stringify(customAnswers));
    formData.append('workLinks', JSON.stringify(subLinks.filter(l => l.url && l.url.trim())));

    // Append each newly-queued file with parallel fieldId/label/type metadata
    for (const f of customFields) {
      if (f.type !== 'image' && f.type !== 'video' && f.type !== 'file') continue;
      const queued = filesByField[f.id] || [];
      queued.forEach(file => {
        formData.append('files', file);
        formData.append('fileFieldIds', f.id);
        formData.append('fileFieldLabels', f.label);
        formData.append('fileFieldTypes', f.type);
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contests/${slug}/submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setUserSubmission(data.submission);

      // Clear local queues (they're now on the server) and refresh uploadedFiles map
      const grouped = {};
      (data.submission.files || []).forEach(f => {
        if (!grouped[f.fieldId]) grouped[f.fieldId] = [];
        grouped[f.fieldId].push(f);
      });
      setUploadedFiles(grouped);
      setFilesByField({});
      setFileErrors({});

      setSuccessMsg('Your contest entry has been submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw your submission?')) return;
    try {
      const res = await fetch(`/api/contests/${slug}/submit`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Withdrawal failed');
      setUserSubmission(null);
      setSubTitle('');
      setSubDesc('');
      setSubFileUrl('');
      setSubLinks([{ title: 'Project / GitHub Link', url: '' }]);
      setFilesByField({});
      setUploadedFiles({});
      setFileErrors({});
      setSuccessMsg('Submission withdrawn.');
    } catch (err) {
      setError(err.message);
    }
  };

  const getCountdownString = (cycle) => {
    if (!cycle) return 'TBA';
    const now = new Date();
    const start = new Date(cycle.startTime);
    const end = new Date(cycle.endTime);

    if (now < start) {
      const diffHours = Math.ceil((start - now) / (1000 * 60 * 60));
      return `Starts in ${diffHours}h`;
    } else if (now <= end) {
      const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
      if (diffHours > 24) return `Ends in ${Math.ceil(diffHours / 24)} days`;
      return `Ends in ${diffHours}h`;
    }
    return 'Submissions Closed';
  };

  if (loading) {
    return (
      <div className="single-contest-page">
        <div className="single-contest__loading">
          <div className="single-contest__spinner" />
          <p>Loading contest details...</p>
        </div>
      </div>
    );
  }

  // Only treat the page as "Contest Not Found" when there is genuinely no
  // template loaded (initial fetch failed). Submit / mutation errors should
  // stay inline above the form, not boot the user to the not-found screen.
  if (!template && !loading) {
    return (
      <div className="single-contest-page">
        <BackButton href="/contests" label="Back to Contests" />
        <div className="single-contest__error-box">
          <AlertCircle size={40} />
          <h2>Contest Not Found</h2>
          <p>{error || 'The requested contest route does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  const cycle = targetCycle || activeCycle;
  const isHistorical = requestedCycleNum && activeCycle && parseInt(requestedCycleNum, 10) !== activeCycle.cycleNumber;
  const status = cycle?.status || 'upcoming';
  const winners = cycle?.winners || [];

  return (
    <div className="events-page single-contest-page">
      <div className="events-page__topbar">
        <BackButton to="/contests" />
      </div>

      {/* Header / Hero */}
      <section className="sc-hero">
        <div className="sc-hero__banner-wrap">
          {template.bannerUrl ? (
            <img src={template.bannerUrl} alt={template.title} className="sc-hero__banner-img" />
          ) : (
            <div className="sc-hero__banner-fallback"><Trophy size={48} /></div>
          )}
          <div className="sc-hero__overlay" />

          <div className="sc-hero__top-row">
            <span className="sc-type-badge">{template.type.replace('_', ' ').toUpperCase()}</span>
            <span className={`sc-status-pill sc-status-pill--${status}`}>
              {status === 'active' ? '● ONGOING' : status === 'results_published' ? '🏆 RESULTS OUT' : status.toUpperCase()}
            </span>
          </div>

          <div className="sc-hero__content">
            <h1 className="sc-hero__title">{template.title}</h1>
            <p className="sc-hero__desc">{template.description}</p>

            {cycle && (
              <div className="sc-hero__meta-bar">
                <div className="sc-meta-item">
                  <Zap size={14} />
                  <span>{cycle.cycleLabel}</span>
                </div>
                <div className="sc-meta-item sc-meta-item--highlight">
                  <Clock size={14} />
                  <span>{getCountdownString(cycle)}</span>
                </div>
                <div className="sc-meta-item">
                  <Users size={14} />
                  <span>{cycle.participantCount || 0} Participants</span>
                </div>
              </div>
            )}

            {isHistorical && (
              <div className="sc-historical-notice">
                <History size={14} />
                <span>Viewing historical archive for <strong>{cycle.cycleLabel}</strong>. <button onClick={() => router.push(`/contests/${slug}`)}>Return to Current Active Cycle</button></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="sc-container">

        {/* Tab Navigation */}
        <div className="sc-tabs">
          <button className={`sc-tab ${activeTab === 'overview' ? 'sc-tab--active' : ''}`} onClick={() => setActiveTab('overview')}>
            <FileText size={16} /> Overview
          </button>
          <button className={`sc-tab ${activeTab === 'submit' ? 'sc-tab--active' : ''}`} onClick={() => setActiveTab('submit')}>
            <Send size={16} /> Submit Entry
          </button>
          <button className={`sc-tab ${activeTab === 'rules' ? 'sc-tab--active' : ''}`} onClick={() => setActiveTab('rules')}>
            <ShieldCheck size={16} /> Rules & Guidelines
          </button>
          <button className={`sc-tab ${activeTab === 'winners' ? 'sc-tab--active' : ''}`} onClick={() => setActiveTab('winners')}>
            <Trophy size={16} /> Winners {winners.length > 0 && <span className="sc-tab-dot" />}
          </button>
          <button className={`sc-tab ${activeTab === 'history' ? 'sc-tab--active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={16} /> History ({historyCycles.length})
          </button>
        </div>

        {/* Feedback messages */}
        {error && <div className="sc-alert sc-alert--error"><AlertCircle size={18} /><span>{error}</span></div>}
        {successMsg && <div className="sc-alert sc-alert--success"><CheckCircle2 size={18} /><span>{successMsg}</span></div>}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="sc-tab-content">
            <div className="sc-grid-two">
              <div className="sc-card">
                <h2>About Contest</h2>
                <p className="sc-text-p">{template.description || 'Join this competition and showcase your work.'}</p>
                
                {template.prizeInfo && (
                  <div className="sc-prize-card">
                    <div className="sc-prize-header">
                      <Trophy size={20} />
                      <h3>Prizes & Rewards</h3>
                    </div>
                    <p>{template.prizeInfo}</p>
                  </div>
                )}
              </div>

              <div className="sc-card">
                <h2>Contest Information</h2>
                <div className="sc-info-list">
                  <div className="sc-info-row">
                    <span className="sc-info-lbl">Status</span>
                    <span className={`sc-status-pill sc-status-pill--${status}`}>{status.toUpperCase()}</span>
                  </div>
                  <div className="sc-info-row">
                    <span className="sc-info-lbl">Frequency</span>
                    <span>{template.type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="sc-info-row">
                    <span className="sc-info-lbl">Deadline</span>
                    <span>{cycle ? new Date(cycle.endTime).toLocaleString() : 'TBA'}</span>
                  </div>
                  <div className="sc-info-row">
                    <span className="sc-info-lbl">Eligibility</span>
                    <span>{template.eligibility}</span>
                  </div>
                </div>

                <div className="sc-action-cta">
                  <button className="sc-btn sc-btn--primary" onClick={() => setActiveTab('submit')}>
                    <Send size={16} /> Submit Your Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBMIT ENTRY */}
        {activeTab === 'submit' && (
          <div className="sc-tab-content">
            {authStatus !== 'authenticated' ? (
              <div className="sc-card sc-card--center">
                <Lock size={32} />
                <h2>Authentication Required</h2>
                <p>Log in with your KL University account to submit your contest entry.</p>
                <button className="sc-btn sc-btn--primary" onClick={() => signIn('azure-ad', { callbackUrl: `/contests/${slug}` })}>
                  Sign In to Submit
                </button>
              </div>
            ) : status !== 'active' ? (
              <div className="sc-card sc-card--center">
                <Clock size={32} />
                <h2>Submissions Locked</h2>
                <p>Submissions for this contest cycle are currently closed ({status.toUpperCase()}).</p>
              </div>
            ) : (
              <div className="sc-card">
                <h2>Submit Entry ({cycle?.cycleLabel})</h2>
                <p className="sc-subtext">Submit your project details and work links before the deadline ({new Date(cycle.endTime).toLocaleString()}).</p>

                {userSubmission && (
                  <div className="sc-submitted-box">
                    <div className="sc-submitted-header">
                      <CheckCircle2 size={20} style={{ color: '#4caf81' }} />
                      <div>
                        <h4>Entry Submitted</h4>
                        <p>Submitted on {new Date(userSubmission.submittedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="sc-text-p">You can update your entry or links anytime before the deadline.</p>
                  </div>
                )}

                <form onSubmit={handleSubmission} className="sc-form">
                  {Array.isArray(template?.customFields) && template.customFields.length > 0 ? (
                    template.customFields.map((field) => {
                      const val = formAnswers[field.id] || '';
                      return (
                        <div key={field.id} className="sc-field">
                          <label>
                            {field.label} {field.required && <span className="sc-req">*</span>}
                            {(field.type === 'image' || field.type === 'video' || field.type === 'file') && (
                              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                                (Max {field.maxSizeMB || 10} MB{field.maxCount > 1 ? `, up to ${field.maxCount} files` : ''})
                              </span>
                            )}
                          </label>

                          {field.type === 'text' && (
                            <input
                              type="text"
                              className="sc-input"
                              placeholder={field.placeholder || 'Enter response...'}
                              value={val}
                              onChange={e => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                              required={field.required}
                            />
                          )}

                          {field.type === 'textarea' && (
                            <textarea
                              className="sc-textarea"
                              rows={4}
                              placeholder={field.placeholder || 'Write your response...'}
                              value={val}
                              onChange={e => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                              required={field.required}
                            />
                          )}

                          {field.type === 'number' && (
                            <input
                              type="number"
                              className="sc-input"
                              placeholder={field.placeholder || '0'}
                              value={val}
                              onChange={e => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                              required={field.required}
                            />
                          )}

                          {field.type === 'image' && renderFileField(field)}

                          {field.type === 'video' && renderFileField(field)}

                          {field.type === 'file' && renderFileField(field)}

                          {field.type === 'select' && (
                            <select
                              className="sc-input"
                              value={val}
                              onChange={e => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                              required={field.required}
                            >
                              <option value="">Select option...</option>
                              {Array.isArray(field.options) && field.options.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {field.type === 'link' && (
                            <div className="sc-links-list">
                              {subLinks.slice(0, field.maxCount || 3).map((link, idx) => (
                                <div key={idx} className="sc-link-row">
                                  <input
                                    type="text"
                                    className="sc-input sc-input--title"
                                    placeholder="Link Title (e.g. GitHub)"
                                    value={link.title}
                                    onChange={(e) => handleLinkChange(idx, 'title', e.target.value)}
                                  />
                                  <input
                                    type="url"
                                    className="sc-input sc-input--url"
                                    placeholder="https://..."
                                    value={link.url}
                                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                                  />
                                  {subLinks.length > 1 && (
                                    <button type="button" className="sc-link-remove" onClick={() => handleRemoveLink(idx)}>
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {subLinks.length < (field.maxCount || 3) && (
                                <button type="button" className="sc-btn sc-btn--ghost" onClick={handleAddLink} style={{ marginTop: 8 }}>
                                  <Plus size={14} /> Add Link
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.6)' }}>
                      No additional inputs required for this contest. Click below to submit your entry!
                    </div>
                  )}

                  <div className="sc-form-actions">
                    {userSubmission && (
                      <button type="button" className="sc-btn sc-btn--danger" onClick={handleWithdraw}>
                        Withdraw Submission
                      </button>
                    )}
                    <button type="submit" className="sc-btn sc-btn--primary" disabled={submitting}>
                      {submitting ? 'Submitting...' : userSubmission ? 'Update Entry' : 'Submit Entry'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RULES & GUIDELINES */}
        {activeTab === 'rules' && (
          <div className="sc-tab-content">
            <div className="sc-card">
              <h2>Rules & Guidelines</h2>
              <div className="sc-rules-box">
                {template.rules || 'Standard KLFORGE competition rules apply. Ensure all submitted work is original.'}
              </div>

              <div className="sc-guidelines-box" style={{ marginTop: 24 }}>
                <h3>Eligibility</h3>
                <p>{template.eligibility}</p>
                {template.submissionGuidelines && (
                  <>
                    <h3 style={{ marginTop: 16 }}>Submission Guidelines</h3>
                    <p>{template.submissionGuidelines}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WINNERS PODIUM */}
        {activeTab === 'winners' && (
          <div className="sc-tab-content">
            {winners.length === 0 ? (
              <div className="sc-card sc-card--center">
                <Trophy size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <h2>Results Awaiting</h2>
                <p>Winners for {cycle?.cycleLabel} have not been declared yet. Results will be published here after judging concludes.</p>
              </div>
            ) : (
              <div className="sc-winners-container">
                {cycle?.announcementNotes && (
                  <div className="sc-announcement-card">
                    <Sparkles size={20} />
                    <div>
                      <h3>Judges' Announcement</h3>
                      <p>{cycle.announcementNotes}</p>
                    </div>
                  </div>
                )}

                {/* Podium Cards */}
                <div className="sc-podium-grid">
                  {winners.map((win, idx) => (
                    <div key={idx} className={`sc-podium-card sc-podium-card--rank-${win.rank}`}>
                      <div className="sc-podium-card__rank-badge">
                        {win.rank === 1 ? '🥇 1st Place' : win.rank === 2 ? '🥈 2nd Place' : win.rank === 3 ? '🥉 3rd Place' : '⭐ Special Mention'}
                      </div>
                      <h3 className="sc-podium-card__name">{win.name}</h3>
                      <p className="sc-podium-card__sub">{win.rollNumber}</p>
                      {win.awardTitle && <div className="sc-podium-card__award">{win.awardTitle}</div>}
                      {win.judgeNotes && <p className="sc-podium-card__notes">"{win.judgeNotes}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HISTORY ARCHIVE */}
        {activeTab === 'history' && (
          <div className="sc-tab-content">
            <div className="sc-card">
              <h2>Historical Contest Cycles</h2>
              <p className="sc-subtext">Browse past recurring editions, winners, and rankings while staying on this route.</p>

              <div className="sc-history-list">
                {historyCycles.map((c) => (
                  <div
                    key={c.cycleNumber}
                    className={`sc-history-row ${cycle?.cycleNumber === c.cycleNumber ? 'sc-history-row--active' : ''}`}
                    onClick={() => router.push(`/contests/${slug}?cycle=${c.cycleNumber}`)}
                  >
                    <div className="sc-history-row__info">
                      <Zap size={16} />
                      <div>
                        <h4>{c.cycleLabel} (Cycle #{c.cycleNumber})</h4>
                        <p>{new Date(c.startTime).toLocaleDateString()} – {new Date(c.endTime).toLocaleDateString()} • {c.participantCount || 0} Participants</p>
                      </div>
                    </div>
                    <div className="sc-history-row__right">
                      <span className={`sc-status-pill sc-status-pill--${c.status}`}>{c.status.toUpperCase()}</span>
                      <button className="sc-btn sc-btn--ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        View Cycle <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      <div className="footer-separator" />
      <Footer />
    </div>
  );
}
