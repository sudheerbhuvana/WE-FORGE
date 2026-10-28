'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, UserCheck, UserX, Crown, Medal, Award,
  CheckCircle2, FileText, Search, Download, RefreshCw, Sparkles, Calendar,
  Clock, MapPin, ChevronDown, ChevronUp, FileVideo, Link2, Filter, Eye, CheckSquare, Square, RotateCcw, Trash2
} from 'lucide-react';
import '../../AdminDashboard.css';
import './manage.css';
import AdminSidebarWrapper from '@/src/components/admin/AdminSidebarWrapper';

const ROLE_OPTIONS = [
  { value: 'participant', label: 'Participant' },
  { value: 'winner', label: '1st Place — Winner' },
  { value: 'runner_up', label: '2nd Place — Runner-Up' },
  { value: 'third_place', label: '3rd Place' },
];

const toInputDateTime = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export default function AdminEventManagePage() {
  const { id } = useParams();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [regs, setRegs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | present | absent | pending | winners | uncertified
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [editForm, setEditForm]         = useState({});
  const [posterFile, setPosterFile]     = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [editSaving, setEditSaving]     = useState(false);

  // Load event details
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const ev = d?.event || d;
        setEvent(ev);
        if (ev) {
          setEditForm({
            title: ev.title || '',
            description: ev.description || '',
            type: ev.type || '',
            domain: ev.domain || '',
            venue: ev.venue || '',
            slots: ev.slots ?? 50,
            points: ev.points ?? 0,
            startTime: toInputDateTime(ev.startTime),
            endTime: toInputDateTime(ev.endTime),
            registrationDeadline: toInputDateTime(ev.registrationDeadline),
            status: ev.status || 'upcoming',
            accessType: ev.accessType || 'public',
            allowedDomains: Array.isArray(ev.allowedDomains) ? ev.allowedDomains.join(', ') : (ev.allowedDomains || ''),
            allowedMembers: Array.isArray(ev.allowedMembers) ? ev.allowedMembers.join(', ') : (ev.allowedMembers || ''),
            roles: Array.isArray(ev.roles) ? ev.roles.join(', ') : (ev.roles || 'Participant, Volunteer, Organizer'),
            certificateTemplateParticipant: ev.certificateTemplateParticipant || '/templates/certificates/participant.pdf',
            certificateTemplateWinner: ev.certificateTemplateWinner || '/templates/certificates/winner.pdf',
            isRegistrationOpen: ev.isRegistrationOpen !== false,
            isPublished: ev.isPublished !== false,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load registrations + summary
  const loadRegs = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/events/${id}/attendance`);
      const d = await r.json();
      if (r.ok) {
        setRegs(d.registrations || []);
        setSummary(d.summary || null);
      } else {
        setActionErr(d.error || 'Failed to load registrations');
      }
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegs();
  }, [id]);

  // Filtered registrations
  const filtered = useMemo(() => {
    let list = regs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.rollNumber?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q)
      );
    }
    if (filter === 'present') list = list.filter((r) => r.attendance === 'present');
    else if (filter === 'absent') list = list.filter((r) => r.attendance === 'absent');
    else if (filter === 'pending') list = list.filter((r) => r.attendance === 'pending');
    else if (filter === 'winners') list = list.filter((r) => r.eventRole !== 'participant');
    else if (filter === 'uncertified') list = list.filter((r) => r.attendance === 'present' && !r.certificateId);
    return list;
  }, [regs, search, filter]);

  const updateRow = (regId, patch) => {
    setRegs((prev) => prev.map((r) => (r.id === regId ? { ...r, ...patch } : r)));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (regId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    setActionMsg('');
    setActionErr('');
    try {
      const updates = regs.map((r) => ({
        registrationId: r.id,
        attendance: r.attendance,
        eventRole: r.eventRole,
      }));
      const r = await fetch(`/api/admin/events/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const d = await r.json();
      if (r.ok) {
        setActionMsg(`Saved ${d.updated} attendance and role changes.`);
        await loadRegs();
      } else {
        setActionErr(d.error || 'Save failed');
      }
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const markSelectedAttendance = (status) => {
    const targetSet = selectedIds.size > 0 ? selectedIds : new Set(filtered.map((r) => r.id));
    setRegs((prev) =>
      prev.map((r) => (targetSet.has(r.id) ? { ...r, attendance: status } : r))
    );
  };

  const issueCertificates = async (onlyIds) => {
    setIssuing(true);
    setActionMsg('');
    setActionErr('');
    try {
      // 1. Save all pending dropdown changes (attendance & role) first
      const updates = regs.map((r) => ({
        registrationId: r.id,
        attendance: r.attendance,
        eventRole: r.eventRole,
      }));
      await fetch(`/api/admin/events/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      // 2. Issue certificates
      const targetIds = onlyIds || (selectedIds.size > 0 ? Array.from(selectedIds) : null);
      const r = await fetch(`/api/admin/events/${id}/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetIds ? { registrationIds: targetIds } : {}),
      });
      const d = await r.json();
      if (r.ok) {
        setActionMsg(
          `Issued ${d.issuedCount} certificates.${d.skipped.length ? ` Skipped ${d.skipped.length}.` : ''}`
        );

        // Optimistically update local state so attendance is present & certificateId is set
        if (Array.isArray(d.issued)) {
          const issuedMap = new Map(d.issued.map((i) => [i.registrationId, i.certificateId]));
          setRegs((prev) =>
            prev.map((reg) => {
              if (issuedMap.has(reg.id) || issuedMap.has(reg._id)) {
                return {
                  ...reg,
                  attendance: 'present',
                  certificateId: issuedMap.get(reg.id) || issuedMap.get(reg._id),
                };
              }
              return reg;
            })
          );
        }

        await loadRegs();
      } else {
        setActionErr(d.error || 'Issue failed');
      }
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setIssuing(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const revokeCertificate = async (registrationId) => {
    setIssuing(true);
    setActionMsg('');
    setActionErr('');
    try {
      const res = await fetch(`/api/admin/events/${id}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg('Certificate revoked. You can now re-issue with new details.');
        await loadRegs();
      } else {
        setActionErr(data.error || 'Revoke failed');
      }
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setIssuing(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const revokeCertificates = async (targetIds = null) => {
    const idsToRevoke = targetIds || (selectedIds.size > 0 ? Array.from(selectedIds) : null);
    const label = idsToRevoke ? `${idsToRevoke.length} selected certificate(s)` : 'ALL certificates for this event';
    if (!confirm(`Are you sure you want to revoke ${label}?`)) {
      return;
    }

    setIssuing(true);
    setActionMsg('');
    setActionErr('');
    try {
      const res = await fetch(`/api/admin/events/${id}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idsToRevoke ? { registrationIds: idsToRevoke } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || 'Certificates revoked successfully.');
        await loadRegs();
      } else {
        setActionErr(data.error || 'Revoke failed');
      }
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setIssuing(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const downloadZip = () => {
    window.open(`/api/admin/events/${id}/certificates/zip`, '_blank');
  };

  const exportCsv = () => {
    window.open(`/api/admin/events/${id}/export`, '_blank');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setActionErr('');
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });
      if (posterFile) {
        fd.append('poster', posterFile);
      }
      const r = await fetch(`/api/events/${id}`, { method: 'PUT', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      const updated = d?.event || d;
      setEvent(updated);
      setPosterFile(null);
      setPosterPreview(null);
      setEditOpen(false);
      setActionMsg('Event details saved successfully.');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const fillPercent = event?.slots ? Math.min(100, Math.round(((event.registeredCount || 0) / event.slots) * 100)) : 0;

  return (
    <div className="admin-dash">
      <AdminSidebarWrapper activeTab="events" />
      <main className="admin-main">
        <div className="admin-main__content admin-event-manage" data-lenis-prevent="true">
          
          {/* Top navigation */}
          <div className="em-nav">
            <button className="cm-back" onClick={() => router.push('/admin/dashboard?tab=events')}>
              <ArrowLeft size={14} /> Back to Events List
            </button>
          </div>

          {actionErr && <div className="admin-dash__alert admin-dash__alert--error">{actionErr}</div>}
          {actionMsg && <div className="admin-dash__alert admin-dash__alert--success">{actionMsg}</div>}

          {/* ===== Hero Banner ===== */}
          {event ? (
            <header className="em-hero">
              {event.posterUrl && (
                <div className="em-hero__poster-wrap" onClick={() => setShowPosterModal(true)}>
                  <img src={event.posterUrl} alt={event.title} className="em-hero__poster" />
                </div>
              )}
              <div className="em-hero__content">
                <div className="em-hero__badges">
                  <span className="cm-badge cm-badge--info">
                    <Calendar size={11} /> {event.startTime ? new Date(event.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}
                  </span>
                  {event.venue && (
                    <span className="cm-badge cm-badge--neutral">
                      <MapPin size={11} /> {event.venue}
                    </span>
                  )}
                  <span className={`cm-badge cm-badge--${event.status === 'completed' ? 'success' : 'warning'}`}>
                    {event.status || 'upcoming'}
                  </span>
                  {event.accessType && (
                    <span className="cm-badge cm-badge--neutral" style={{ textTransform: 'capitalize' }}>
                      {event.accessType} Access
                    </span>
                  )}
                </div>
                <h1 className="em-hero__title">{event.title || 'Event Management'}</h1>
                {event.description && <p className="em-hero__desc">{event.description}</p>}

                {/* Progress bar */}
                <div className="em-hero__progress-wrap">
                  <div className="em-hero__progress-info">
                    <span>Capacity: {event.registeredCount || 0} / {event.slots || 0} Slots ({fillPercent}% Filled)</span>
                  </div>
                  <div className="em-hero__bar-bg">
                    <div className="em-hero__bar-fill" style={{ width: `${fillPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </header>
          ) : (
            !loading && <div className="cm-empty"><p>Event not found or failed to load.</p></div>
          )}

          {/* ===== Summary stats ===== */}
          {summary && event && (
            <div className="em-stats">
              <Stat icon={Users} value={summary.total} label="Registered" variant="purple" sub={`${fillPercent}% slots`} />
              <Stat icon={UserCheck} value={summary.present} label="Attended" variant="green" sub={`${summary.total ? Math.round((summary.present / summary.total) * 100) : 0}% turn-out`} />
              <Stat icon={UserX} value={summary.absent} label="Absent" variant="orange" sub="Marked absent" />
              <Stat icon={Crown} value={summary.winners + summary.runners + summary.thirds} label="Winners" variant="yellow" sub="1st, 2nd & 3rd" />
              <Stat icon={FileText} value={summary.certificatesIssued} label="Certificates" variant="blue" sub={`${summary.present ? Math.round((summary.certificatesIssued / summary.present) * 100) : 0}% issued`} />
            </div>
          )}

          {/* ===== Action Toolbar ===== */}
          {event && (
            <div className="em-toolbar">
              <div className="em-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search name, roll, or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="em-filters">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'present', label: 'Attended' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'absent', label: 'Absent' },
                  { id: 'winners', label: 'Winners' },
                  { id: 'uncertified', label: 'Uncertified' },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`cm-btn cm-btn--sm ${filter === f.id ? 'cm-btn--primary' : ''}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="em-toolbar__actions">
                <button className="cm-btn cm-btn--sm" onClick={() => markSelectedAttendance('present')} disabled={loading}>
                  <UserCheck size={12} /> {selectedIds.size > 0 ? `Mark (${selectedIds.size}) Attended` : 'Mark All Attended'}
                </button>
                <button className="cm-btn cm-btn--sm cm-btn--primary" onClick={saveAll} disabled={saving}>
                  <RefreshCw size={12} className={saving ? 'spin' : ''} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="cm-btn cm-btn--sm" onClick={() => issueCertificates()} disabled={issuing}>
                  <Sparkles size={12} /> {issuing ? 'Issuing…' : 'Issue Certificates'}
                </button>
                <button
                  className="cm-btn cm-btn--sm"
                  onClick={() => revokeCertificates()}
                  disabled={issuing || !summary?.certificatesIssued}
                  title={selectedIds.size > 0 ? `Revoke certificates for ${selectedIds.size} selected` : 'Revoke all certificates for this event'}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={12} /> {selectedIds.size > 0 ? `Revoke (${selectedIds.size})` : 'Revoke All Certs'}
                </button>
                <button className="cm-btn cm-btn--sm" onClick={exportCsv} title="Export CSV Data">
                  <Download size={12} /> Export CSV
                </button>
                <button className="cm-btn cm-btn--sm" onClick={downloadZip} disabled={!summary?.certificatesIssued} title="Download Bulk Certificates ZIP">
                  <Download size={12} /> Certs ZIP
                </button>
              </div>
            </div>
          )}

          {/* ===== Edit Event Details ===== */}
          {event && (
            <div className="cm-card" style={{ marginBottom: 16 }}>
              <div
                className="cm-row cm-row--between"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setEditOpen(o => !o)}
              >
                <h3 className="cm-card__title" style={{ margin: 0 }}>
                  ✏️ Edit Event Details
                </h3>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                  {editOpen ? '▲ Collapse' : '▼ Expand'}
                </span>
              </div>

              {editOpen && (
                <form onSubmit={saveEdit} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Poster Image */}
                  <div className="cm-field">
                    <label className="cm-label">Event Poster</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                      {(posterPreview || event.posterUrl) && (
                        <img
                          src={posterPreview || event.posterUrl}
                          alt="Poster Preview"
                          style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPosterFile(file);
                              setPosterPreview(URL.createObjectURL(file));
                            }
                          }}
                          style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                          Upload new JPG, PNG, or WebP to replace existing banner
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="cm-field">
                    <label className="cm-label">Title *</label>
                    <input className="cm-input" required value={editForm.title || ''}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>

                  {/* Description */}
                  <div className="cm-field">
                    <label className="cm-label">Description</label>
                    <textarea className="cm-input" rows={3} value={editForm.description || ''}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                  </div>

                  {/* Type + Domain + Venue */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Type</label>
                      <input className="cm-input" placeholder="e.g. Workshop, Hackathon"
                        value={editForm.type || ''}
                        onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Domain</label>
                      <input className="cm-input" placeholder="e.g. Technical, Cultural"
                        value={editForm.domain || ''}
                        onChange={e => setEditForm(p => ({ ...p, domain: e.target.value }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Venue</label>
                      <input className="cm-input" placeholder="e.g. Auditorium, Room 204"
                        value={editForm.venue || ''}
                        onChange={e => setEditForm(p => ({ ...p, venue: e.target.value }))} />
                    </div>
                  </div>

                  {/* Slots + Points */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Slots</label>
                      <input className="cm-input" type="number" min={0}
                        value={editForm.slots ?? ''}
                        onChange={e => setEditForm(p => ({ ...p, slots: Number(e.target.value) }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Points</label>
                      <input className="cm-input" type="number" min={0}
                        value={editForm.points ?? ''}
                        onChange={e => setEditForm(p => ({ ...p, points: Number(e.target.value) }))} />
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Start Date & Time *</label>
                      <input className="cm-input" type="datetime-local" required
                        value={editForm.startTime || ''}
                        onChange={e => setEditForm(p => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">End Date & Time *</label>
                      <input className="cm-input" type="datetime-local" required
                        value={editForm.endTime || ''}
                        onChange={e => setEditForm(p => ({ ...p, endTime: e.target.value }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Registration Deadline</label>
                      <input className="cm-input" type="datetime-local"
                        value={editForm.registrationDeadline || ''}
                        onChange={e => setEditForm(p => ({ ...p, registrationDeadline: e.target.value }))} />
                    </div>
                  </div>

                  {/* Access Control & Roles */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Access Type</label>
                      <select className="cm-input" value={editForm.accessType || 'public'}
                        onChange={e => setEditForm(p => ({ ...p, accessType: e.target.value }))}>
                        <option value="public">Public (Open to All)</option>
                        <option value="domain">Domain Restricted</option>
                        <option value="private">Private (Invite / Roll list)</option>
                      </select>
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Roles Allowed</label>
                      <input className="cm-input" placeholder="Participant, Volunteer, Organizer"
                        value={editForm.roles || ''}
                        onChange={e => setEditForm(p => ({ ...p, roles: e.target.value }))} />
                    </div>
                  </div>

                  {/* Conditional Domain or Private Access Details */}
                  {editForm.accessType === 'domain' && (
                    <div className="cm-field">
                      <label className="cm-label">Allowed Domains (comma-separated)</label>
                      <input className="cm-input" placeholder="e.g. Technical, Creative, Events"
                        value={editForm.allowedDomains || ''}
                        onChange={e => setEditForm(p => ({ ...p, allowedDomains: e.target.value }))} />
                    </div>
                  )}

                  {editForm.accessType === 'private' && (
                    <div className="cm-field">
                      <label className="cm-label">Allowed Member Roll Numbers (comma-separated)</label>
                      <textarea className="cm-input" rows={2} placeholder="e.g. 2200030001, 2200030002"
                        value={editForm.allowedMembers || ''}
                        onChange={e => setEditForm(p => ({ ...p, allowedMembers: e.target.value }))} />
                    </div>
                  )}

                  {/* Certificate Templates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Participant Certificate Template</label>
                      <input className="cm-input" placeholder="/templates/certificates/participant.pdf"
                        value={editForm.certificateTemplateParticipant || ''}
                        onChange={e => setEditForm(p => ({ ...p, certificateTemplateParticipant: e.target.value }))} />
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Winner Certificate Template</label>
                      <input className="cm-input" placeholder="/templates/certificates/winner.pdf"
                        value={editForm.certificateTemplateWinner || ''}
                        onChange={e => setEditForm(p => ({ ...p, certificateTemplateWinner: e.target.value }))} />
                    </div>
                  </div>

                  {/* Status + Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div className="cm-field">
                      <label className="cm-label">Status</label>
                      <select className="cm-input" value={editForm.status || 'upcoming'}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="ended">Ended</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="cm-field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={!!editForm.isRegistrationOpen}
                          onChange={e => setEditForm(p => ({ ...p, isRegistrationOpen: e.target.checked }))} />
                        Registration Open
                      </label>
                    </div>
                    <div className="cm-field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={!!editForm.isPublished}
                          onChange={e => setEditForm(p => ({ ...p, isPublished: e.target.checked }))} />
                        Published
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="submit" className="cm-btn cm-btn--primary" disabled={editSaving}>
                      {editSaving ? 'Saving…' : '💾 Save Changes'}
                    </button>
                    <button type="button" className="cm-btn" onClick={() => setEditOpen(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ===== Registrations Table ===== */}
          {event && (
            <div className="cm-card">
              <div className="cm-row cm-row--between" style={{ marginBottom: 14 }}>
                <h3 className="cm-card__title" style={{ margin: 0 }}>
                  <Users size={16} /> Participant Registrations & Attendance
                  <span className="cm-badge cm-badge--neutral" style={{ marginLeft: 8 }}>
                    {filtered.length} of {regs.length}
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="cm-badge cm-badge--info" style={{ marginLeft: 6 }}>
                      {selectedIds.size} selected
                    </span>
                  )}
                </h3>
              </div>

              {loading ? (
                <div className="cm-empty"><p>Loading registrations…</p></div>
              ) : filtered.length === 0 ? (
                <div className="cm-empty">
                  <div className="cm-empty__icon"><Users size={24} /></div>
                  <p className="cm-empty__title">No matching participants found</p>
                  <p className="cm-empty__desc">Try adjusting your search query or filter chip.</p>
                </div>
              ) : (
                <div className="cm-table-wrap">
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <button type="button" className="em-check-btn" onClick={toggleSelectAll}>
                            {selectedIds.size === filtered.length && filtered.length > 0 ? (
                              <CheckSquare size={16} color="#71C4FF" />
                            ) : (
                              <Square size={16} color="rgba(255,255,255,0.4)" />
                            )}
                          </button>
                        </th>
                        <th>Participant</th>
                        <th>Roll Number & Email</th>
                        <th>Attendance</th>
                        <th>Position / Role</th>
                        <th>Certificate</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const isExpanded = expandedId === r.id;
                        const hasAnswers = Array.isArray(r.customAnswers) && r.customAnswers.length > 0;
                        const isSelected = selectedIds.has(r.id);

                        return (
                          <React.Fragment key={r.id}>
                            <tr className={isSelected ? 'em-tr--selected' : ''}>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" className="em-check-btn" onClick={() => toggleSelectOne(r.id)}>
                                  {isSelected ? (
                                    <CheckSquare size={16} color="#71C4FF" />
                                  ) : (
                                    <Square size={16} color="rgba(255,255,255,0.3)" />
                                  )}
                                </button>
                              </td>
                              <td>
                                <div className="cm-row" style={{ gap: 10 }}>
                                  {hasAnswers ? (
                                    <button
                                      type="button"
                                      className="cm-btn cm-btn--icon"
                                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                      title={isExpanded ? 'Hide answers' : 'View form answers'}
                                      style={{ padding: 4 }}
                                    >
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                  ) : (
                                    <div style={{ width: 22 }} />
                                  )}
                                  <div className="cm-drawer__avatar" style={{ width: 32, height: 32, fontSize: '0.84rem' }}>
                                    {(r.name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="cm-table__name">{r.name}</div>
                                    <div className="cm-table__sub">Registered: {new Date(r.registeredAt).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="cm-table__name" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.86rem' }}>
                                  {r.rollNumber}
                                </div>
                                <div className="cm-table__sub">{r.email}</div>
                              </td>
                              <td>
                                <select
                                  className="em-select"
                                  value={r.attendance || 'pending'}
                                  onChange={(e) => updateRow(r.id, { attendance: e.target.value })}
                                >
                                  <option value="pending">⏳ Pending</option>
                                  <option value="present">✓ Attended</option>
                                  <option value="absent">✕ Absent</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  className="em-select"
                                  value={r.eventRole || 'participant'}
                                  onChange={(e) => updateRow(r.id, { eventRole: e.target.value })}
                                >
                                  {ROLE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {r.certificateId ? (
                                  <div className="em-cert-cell">
                                    <span className="cm-badge cm-badge--success">
                                      <CheckCircle2 size={11} /> Issued
                                    </span>
                                    <code className="em-cert-id">{r.certificateId}</code>
                                  </div>
                                ) : (
                                  <span className="cm-badge cm-badge--neutral">—</span>
                                )}
                              </td>
                              <td>
                                <div className="em-action-group">
                                  {r.certificateId ? (
                                    <>
                                      <a
                                        className="em-action-btn em-action-btn--download"
                                        href={`/api/certificates/${r.certificateId}/download?token=${r.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Download Certificate PDF"
                                      >
                                        <Download size={13} /> PDF
                                      </a>
                                      <button
                                        type="button"
                                        className="em-action-btn em-action-btn--reissue"
                                        onClick={() => issueCertificates([r.id])}
                                        disabled={issuing}
                                        title="Re-issue certificate with updated position/role"
                                      >
                                        <RotateCcw size={13} /> Re-issue
                                      </button>
                                      <button
                                        type="button"
                                        className="em-action-btn em-action-btn--revoke"
                                        onClick={() => revokeCertificate(r.id)}
                                        disabled={issuing}
                                        title="Revoke & delete certificate"
                                      >
                                        <Trash2 size={13} /> Revoke
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="em-action-btn em-action-btn--issue"
                                      onClick={() => issueCertificates([r.id])}
                                      disabled={issuing}
                                      title="Issue certificate & mark attended"
                                    >
                                      <Sparkles size={13} /> Issue Cert
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Form Answers Row */}
                            {isExpanded && hasAnswers && (
                              <tr>
                                <td colSpan="7" className="em-expanded-cell">
                                  <div className="em-answers-grid">
                                    <div className="em-answers-title">Custom Registration Form Answers:</div>
                                    <div className="em-answers-cards">
                                      {r.customAnswers.map((a, i) => (
                                        <div key={i} className="em-answer-card">
                                          <div className="em-answer-label">{a.label}</div>
                                          
                                          {a.type === 'image' && Array.isArray(a.files) && a.files.length > 0 && (
                                            <div className="em-answer-files">
                                              {a.files.map((f, k) => (
                                                <a key={k} href={f.url} target="_blank" rel="noreferrer" className="em-file-thumb">
                                                  <img src={f.url} alt={f.originalName || 'upload'} />
                                                </a>
                                              ))}
                                            </div>
                                          )}

                                          {a.type === 'video' && Array.isArray(a.files) && a.files.length > 0 && (
                                            <div className="em-answer-links">
                                              {a.files.map((f, k) => (
                                                <a key={k} href={f.url} target="_blank" rel="noreferrer">
                                                  <FileVideo size={12} /> {f.originalName || 'Watch Video'}
                                                </a>
                                              ))}
                                            </div>
                                          )}

                                          {a.type === 'file' && Array.isArray(a.files) && a.files.length > 0 && (
                                            <div className="em-answer-links">
                                              {a.files.map((f, k) => (
                                                <a key={k} href={f.url} target="_blank" rel="noreferrer">
                                                  <FileText size={12} /> {f.originalName || 'Download File'}
                                                </a>
                                              ))}
                                            </div>
                                          )}

                                          {a.type === 'link' && Array.isArray(a.workLinks) && a.workLinks.length > 0 && (
                                            <div className="em-answer-links">
                                              {a.workLinks.map((l, k) => (
                                                <a key={k} href={l.url} target="_blank" rel="noreferrer">
                                                  <Link2 size={12} /> {l.title || l.url}
                                                </a>
                                              ))}
                                            </div>
                                          )}

                                          {!['image', 'video', 'file', 'link'].includes(a.type) && (
                                            <div className="em-answer-value">
                                              {a.value || <span style={{ opacity: 0.4 }}>—</span>}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Lightbox poster modal */}
          {showPosterModal && event?.posterUrl && (
            <div className="event-poster-modal" onClick={() => setShowPosterModal(false)}>
              <div className="event-poster-modal__content" onClick={(e) => e.stopPropagation()}>
                <img src={event.posterUrl} alt={event.title} className="event-poster-modal__img" />
                <button className="event-poster-modal__close" onClick={() => setShowPosterModal(false)}>✕</button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, value, label, variant, sub }) {
  return (
    <div className="cm-stat">
      <div className={`cm-stat__icon ${variant ? `cm-stat__icon--${variant}` : ''}`}>
        <Icon size={18} />
      </div>
      <div className="cm-stat__body">
        <div className="cm-stat__value">{value}</div>
        <div className="cm-stat__label">{label}</div>
        {sub && <div className="cm-stat__sub" style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
