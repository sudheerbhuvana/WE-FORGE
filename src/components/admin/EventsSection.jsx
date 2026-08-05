'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Users, Edit3, Trash2, Calendar, CheckCircle, X, ListChecks, ChevronUp, ChevronDown, FileText, Image as ImageIcon, FileVideo, Link2, Hash, Plus as PlusIcon, ClipboardCheck } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import eventService from '../../../src/services/eventService';
import ModernDateTimePicker from '../../../src/components/ModernDateTimePicker';
import '../../../app/admin/dashboard/AdminDashboard.css';

const TYPE_BADGE_COLORS = { workshop: '#3b82f6', hackathon: '#f59e0b', competition: '#ef4444', talk: '#8b5cf6', seminar: '#10b981' };

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const fmtRange = (s, e) => {
  if (!s) return 'TBA';
  const st = new Date(s);
  const et = e ? new Date(e) : null;
  const d = st.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const t = st.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!et) return `${d}, ${t}`;
  const endT = et.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${d}, ${t} - ${endT}`;
};

const canManageEventClient = (actor, event) => {
  if (!actor) return false;
  if (actor.isElite) return true;
  return event?.domain === actor.domain;
};

const EMPTY_EVENT_FORM = {
  title: '', description: '', type: '', points: 0, slots: 50, registrationDeadline: '', startTime: '', endTime: '', venue: '',
  accessType: 'public', allowedDomains: [], allowedMembers: [], roles: ['Participant', 'Volunteer', 'Organizer'], isRegistrationOpen: true,
  customFields: [],
};

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'link', label: 'Work Links' },
  { value: 'image', label: 'Image Upload' },
  { value: 'video', label: 'Video Upload' },
  { value: 'file', label: 'File Upload' },
  { value: 'select', label: 'Dropdown' },
];

const newFieldId = () => `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function croppedBlobFromImage(image, crop) {
  if (!image || !crop || !crop.width || !crop.height) return null;
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  );
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export default function EventsSection({ events, adminInfo, refreshData }) {
  const router = useRouter();

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventEditing, setEventEditing] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventDeleteConfirm, setEventDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  // Poster & Crop
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [crop, setCrop] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [removePoster, setRemovePoster] = useState(false);
  const imgRef = React.useRef(null);

  // Regs Modal
  const [showRegsModal, setShowRegsModal] = useState(false);
  const [selectedEventForRegs, setSelectedEventForRegs] = useState(null);
  const [eventRegs, setEventRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [expandedRegId, setExpandedRegId] = useState(null);

  const openAddEvent = () => {
    setEventEditing(null);
    setEventForm({ ...EMPTY_EVENT_FORM, customFields: [] });
    setPosterFile(null);
    setPosterPreview(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setRemovePoster(false);
    setShowEventForm(true);
  };

  const openEditEvent = (ev) => {
    setEventEditing(ev);
    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      type: ev.type || '',
      points: ev.points || 0,
      slots: ev.slots || 50,
      registrationDeadline: ev.registrationDeadline || '',
      startTime: ev.startTime || '',
      endTime: ev.endTime || '',
      venue: ev.venue || '',
      accessType: ev.accessType || 'public',
      allowedDomains: ev.allowedDomains || [],
      allowedMembers: ev.allowedMembers || [],
      roles: ev.roles || ['Participant', 'Volunteer', 'Organizer'],
      isRegistrationOpen: ev.isRegistrationOpen !== false,
      customFields: Array.isArray(ev.customFields) ? ev.customFields.map((f) => ({ ...f })) : [],
    });
    setPosterFile(null);
    setPosterPreview(ev.posterUrl || null);
    setCrop(undefined);
    setCompletedCrop(null);
    setRemovePoster(false);
    setShowEventForm(true);
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    setCrop({
      unit: '%',
      x: 5,
      y: 5,
      width: 90,
      height: 90,
      aspect: 16 / 9,
    });
  };

  const handlePosterChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setRemovePoster(false);
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleEventDelete = async (id) => {
    try {
      await eventService.delete(id);
      setEventDeleteConfirm(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventSaving(true);
    setError('');

    try {
      const formData = new FormData();
      Object.keys(eventForm).forEach(key => {
        if (key === 'customFields') {
          formData.append('customFields', JSON.stringify(eventForm.customFields || []));
        } else if (Array.isArray(eventForm[key])) {
          formData.append(key, JSON.stringify(eventForm[key]));
        } else {
          formData.append(key, eventForm[key]);
        }
      });

      if (posterPreview && completedCrop && imgRef.current) {
        const croppedBlob = await croppedBlobFromImage(imgRef.current, completedCrop);
        if (croppedBlob) {
          formData.append('poster', croppedBlob, 'poster.png');
        }
      } else if (posterFile) {
        formData.append('poster', posterFile);
      }

      if (eventEditing) {
        await eventService.update(eventEditing.id, formData);
      } else {
        await eventService.create(formData);
      }

      setShowEventForm(false);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setEventSaving(false);
    }
  };

  // ---- Custom form field helpers ----
  const addCustomField = () => {
    setEventForm((prev) => ({
      ...prev,
      customFields: [
        ...(prev.customFields || []),
        { id: newFieldId(), label: 'New Field', type: 'text', required: false, placeholder: '', maxSizeMB: 10, maxCount: 1, options: [] },
      ],
    }));
  };

  const updateCustomField = (idx, patch) => {
    setEventForm((prev) => {
      const next = [...(prev.customFields || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, customFields: next };
    });
  };

  const removeCustomField = (idx) => {
    setEventForm((prev) => ({ ...prev, customFields: (prev.customFields || []).filter((_, i) => i !== idx) }));
  };

  const moveCustomField = (idx, dir) => {
    setEventForm((prev) => {
      const next = [...(prev.customFields || [])];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...prev, customFields: next };
    });
  };

  const viewRegistrations = async (ev) => {
    setSelectedEventForRegs(ev);
    setShowRegsModal(true);
    setRegsLoading(true);
    try {
      const regs = await eventService.getRegistrations(ev.id);
      setEventRegs(regs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRegsLoading(false);
    }
  };

  return (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Events</h2>
          <p className="admin-section__subtitle">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-dash__add-btn" onClick={openAddEvent}><Plus size={18} /> Add Event</button>
      </div>
      {error && !showEventForm && <div className="admin-dash__error">{error}</div>}

      {/* Desktop table */}
      <div className="admin-dash__table-wrap" data-lenis-prevent="true">
        <table className="admin-dash__table">
          <thead><tr><th>Poster</th><th>Title</th><th>Type</th><th>Access</th><th>Event Date</th><th>Slots</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>
                  {ev.posterUrl
                    ? <img className="admin-dash__avatar" src={ev.posterUrl} alt={ev.title} style={{ borderRadius: 6, objectFit: 'cover' }} />
                    : <span className="admin-dash__no-poster">—</span>}
                </td>
                <td className="admin-dash__name-cell">{ev.title}</td>
                <td><span className="admin-dash__type-badge" style={{ background: TYPE_BADGE_COLORS[ev.type] || '#555' }}>{ev.type}</span></td>
                <td><span className={`admin-dash__access-tag admin-dash__access-tag--${ev.accessType || 'public'}`}>{ev.accessType || 'public'}</span></td>
                <td className="admin-dash__mono" style={{ fontSize: '0.75rem' }}>{fmtRange(ev.startTime, ev.endTime)}</td>
                <td className="admin-dash__mono">{ev.registeredCount} / {ev.slots}</td>
                <td><span className={`admin-dash__status admin-dash__status--${ev.status}`}>{ev.status}</span></td>
                <td className="admin-dash__actions-cell">
                  <button className="admin-dash__icon-btn" title="View Event Page" onClick={() => router.push(`/events/${ev.id}`)}><Eye size={15} /></button>
                  {(adminInfo?.isElite || canManageEventClient(adminInfo, ev)) && (
                    <>
                      <button className="admin-dash__icon-btn" title="Manage Attendance & Certificates" onClick={() => router.push(`/admin/dashboard/events/${ev.id}`)}><ClipboardCheck size={15} /></button>
                      <button className="admin-dash__icon-btn" title="View Registrations" onClick={() => viewRegistrations(ev)}><Users size={15} /></button>
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" onClick={() => openEditEvent(ev)}><Edit3 size={15} /></button>
                    </>
                  )}
                  {eventDeleteConfirm === ev.id ? (
                    <span className="admin-dash__delete-confirm">Sure?
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleEventDelete(ev.id)}>Yes</button>
                      <button className="admin-dash__icon-btn" onClick={() => setEventDeleteConfirm(null)}>No</button>
                    </span>
                  ) : (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => setEventDeleteConfirm(ev.id)}><Trash2 size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <div className="admin-dash__empty">No events yet. Click &ldquo;Add Event&rdquo; to create one.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {events.length === 0 && <div className="admin-dash__empty">No events yet. Tap &ldquo;Add Event&rdquo; to create one.</div>}
        {events.map((ev) => (
          <div key={ev.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              {ev.posterUrl
                ? <img className="admin-mob-card__avatar admin-mob-card__avatar--event" src={ev.posterUrl} alt={ev.title} />
                : <div className="admin-mob-card__avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(125,190,255,0.08)', color:'rgba(125,190,255,0.4)', fontSize:'1.2rem' }}><Calendar size={20} /></div>}
              <div className="admin-mob-card__info">
                <div className="admin-mob-card__name">{ev.title}</div>
                <div className="admin-mob-card__sub">{fmtDate(ev.eventDate)} &bull; {ev.registeredCount}/{ev.slots} slots</div>
              </div>
            </div>
            <div className="admin-mob-card__chips">
              <span className="admin-dash__type-badge" style={{ background: TYPE_BADGE_COLORS[ev.type] || '#555' }}>{ev.type}</span>
              <span className={`admin-dash__status admin-dash__status--${ev.status}`}>{ev.status}</span>
            </div>
            {ev.description && <div className="admin-mob-card__desc">{ev.description}</div>}
            {eventDeleteConfirm === ev.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this event?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleEventDelete(ev.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setEventDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                <button className="admin-mob-btn" onClick={() => router.push(`/events/${ev.id}`)}><Eye size={15} /> View</button>
                {(adminInfo?.isElite || canManageEventClient(adminInfo, ev)) && (
                  <>
                    <button className="admin-mob-btn" onClick={() => viewRegistrations(ev)}><Users size={15} /> Regs</button>
                    <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditEvent(ev)}><Edit3 size={15} /> Edit</button>
                    <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setEventDeleteConfirm(ev.id)}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Event Modal */}
      {showEventForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={() => setShowEventForm(false)}>
          <form className="admin-dash__modal" style={{ maxWidth: '1200px', width: '95vw' }} onClick={e => e.stopPropagation()} onSubmit={handleEventSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{eventEditing ? 'Edit Event' : 'Add New Event'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowEventForm(false)}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            
            <div className="admin-dash__modal-body">
              {/* Section 1: Event Basic Information */}
              <div className="admin-modal-section">
                <div className="admin-modal-section__title"><FileText size={15} /> 1. Event Details</div>
                <div className="admin-dash__form-grid admin-dash__form-grid--2col">
                  <div className="admin-dash__field admin-dash__field--full"><label>Title *</label><input required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className="admin-dash__input" /></div>
                  <div className="admin-dash__field admin-dash__field--full"><label>Description</label><textarea rows="3" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="What's this event about?" className="admin-dash__input" /></div>
                  <div className="admin-dash__field"><label>Event Type</label><input value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} placeholder="e.g. Workshop, Seminar" className="admin-dash__input" /></div>
                  <div className="admin-dash__field"><label>Venue</label><input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="e.g. A Block Seminar Hall" className="admin-dash__input" /></div>
                  <div className="admin-dash__field"><label>Points</label><input type="number" value={eventForm.points} onChange={e => setEventForm({ ...eventForm, points: Number(e.target.value) })} className="admin-dash__input" /></div>
                  <div className="admin-dash__field"><label>Slots</label><input type="number" value={eventForm.slots} onChange={e => setEventForm({ ...eventForm, slots: Number(e.target.value) })} className="admin-dash__input" /></div>
                </div>
              </div>

              {/* Section 2: Timings & Schedule */}
              <div className="admin-modal-section">
                <div className="admin-modal-section__title"><Calendar size={15} /> 2. Schedule & Timings</div>
                <div className="admin-dash__form-grid admin-dash__form-grid--2col">
                  <div className="admin-dash__field">
                    <label>Start Time *</label>
                    <ModernDateTimePicker value={eventForm.startTime} onChange={val => setEventForm({ ...eventForm, startTime: val })} placeholder="Select Start Time" />
                  </div>
                  <div className="admin-dash__field">
                    <label>End Time *</label>
                    <ModernDateTimePicker value={eventForm.endTime} onChange={val => setEventForm({ ...eventForm, endTime: val })} placeholder="Select End Time" />
                  </div>
                </div>
              </div>

              {/* Section 3: Event Banner / Poster */}
              <div className="admin-modal-section">
                <div className="admin-modal-section__title"><ImageIcon size={15} /> 3. Event Banner / Poster (Crop & Upload)</div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ width: 220, height: 124, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {removePoster ? (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>No Poster</span>
                    ) : posterPreview ? (
                      <img src={posterPreview} alt="Poster preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>No Poster</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 200 }}>
                    <label className="admin-dash__add-btn" style={{ width: 'fit-content', cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem' }}>
                      <ImageIcon size={15} />
                      {posterPreview ? 'Replace Poster Image' : 'Upload Poster Image'}
                      <input type="file" accept="image/*" onChange={handlePosterChange} hidden />
                    </label>
                    {posterPreview && !removePoster && (
                      <button
                        type="button"
                        className="admin-dash__icon-btn admin-dash__icon-btn--danger"
                        style={{ width: 'fit-content', padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8 }}
                        onClick={() => {
                          setRemovePoster(true);
                          setPosterPreview(null);
                          setPosterFile(null);
                          setCompletedCrop(null);
                        }}
                      >
                        <Trash2 size={13} style={{ marginRight: 4 }} /> Remove Poster
                      </button>
                    )}
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                      Recommended aspect ratio: 16:9. Select an image to crop and set as event banner.
                    </p>
                  </div>
                </div>

                {posterPreview && !removePoster && (
                  <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                      Crop Poster (16:9 Aspect Ratio)
                    </div>
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={16 / 9}
                      keepSelection
                    >
                      <img
                        ref={imgRef}
                        src={posterPreview}
                        alt="Poster crop preview"
                        onLoad={onImageLoad}
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                      />
                    </ReactCrop>
                  </div>
                )}
              </div>

              {/* Section 4: Custom Registration Form */}
              <div className="admin-modal-section">
                <div className="admin-modal-section__title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ListChecks size={15} /> 4. Custom Registration Form Fields</span>
                  <button type="button" onClick={addCustomField} className="admin-dash__save-btn" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                    <PlusIcon size={13} /> Add Field
                  </button>
                </div>
                <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                  Optional fields collected from participants during registration — project links, resumes, team details, etc. Leave empty for a basic registration.
                </p>
                {(eventForm.customFields || []).length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', padding: 24, borderRadius: 12, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    No custom fields added yet. Click &ldquo;Add Field&rdquo; to prompt participants for extra details (e.g. GitHub profile, resumes, project links).
                  </div>
                ) : (
                  eventForm.customFields.map((field, idx) => (
                    <div key={field.id} className="admin-field-card">
                      <div className="admin-field-card__top">
                        <span className="admin-field-card__index">{(idx + 1).toString().padStart(2, '0')}</span>
                        <input
                          type="text"
                          className="admin-dash__input admin-field-card__label-input"
                          placeholder="Field Label (e.g. Portfolio URL)"
                          value={field.label}
                          onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                        />
                        <select
                          className="admin-dash__input admin-field-card__type-select"
                          value={field.type}
                          onChange={(e) => updateCustomField(idx, { type: e.target.value })}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <label className={`admin-field-card__required-toggle ${field.required ? 'admin-field-card__required-toggle--active' : 'admin-field-card__required-toggle--inactive'}`}>
                          <input
                            type="checkbox"
                            checked={!!field.required}
                            onChange={(e) => updateCustomField(idx, { required: e.target.checked })}
                          />
                          <CheckCircle size={13} style={{ opacity: field.required ? 1 : 0.4 }} />
                          {field.required ? 'Required' : 'Optional'}
                        </label>
                        <div className="admin-field-card__actions">
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveCustomField(idx, -1)} disabled={idx === 0} title="Move up"><ChevronUp size={14} /></button>
                          <button type="button" className="admin-dash__icon-btn" onClick={() => moveCustomField(idx, 1)} disabled={idx === eventForm.customFields.length - 1} title="Move down"><ChevronDown size={14} /></button>
                          <button type="button" className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => removeCustomField(idx)} title="Remove field"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      <div className="admin-field-card__bottom">
                        <input
                          type="text"
                          className="admin-dash__input"
                          placeholder="Placeholder text (e.g. https://github.com/...)"
                          value={field.placeholder || ''}
                          onChange={(e) => updateCustomField(idx, { placeholder: e.target.value })}
                          style={{ flex: 1, minWidth: 200 }}
                        />
                        {(field.type === 'image' || field.type === 'video' || field.type === 'file') && (
                          <div className="admin-field-card__pill">
                            <span>Max Size:</span>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              className="admin-dash__input"
                              value={field.maxSizeMB || 10}
                              onChange={(e) => updateCustomField(idx, { maxSizeMB: parseInt(e.target.value, 10) || 10 })}
                            />
                            <span>MB</span>
                          </div>
                        )}
                        {(field.type === 'image' || field.type === 'link') && (
                          <div className="admin-field-card__pill">
                            <span>Max Files/Links:</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className="admin-dash__input"
                              value={field.maxCount || 1}
                              onChange={(e) => updateCustomField(idx, { maxCount: parseInt(e.target.value, 10) || 1 })}
                            />
                          </div>
                        )}
                      </div>

                      {field.type === 'select' && (
                        <SelectOptionsEditor
                          options={field.options || []}
                          onChange={(options) => updateCustomField(idx, { options })}
                        />
                      )}

                      <div className="admin-field-card__type-hint">
                        💡 {field.type === 'text' && 'Standard single-line text input'}
                        {field.type === 'textarea' && 'Multi-line text area for longer responses'}
                        {field.type === 'number' && 'Numeric input field'}
                        {field.type === 'email' && 'Email format validated input'}
                        {field.type === 'link' && 'Allows participants to submit custom URLs & titles'}
                        {field.type === 'image' && 'Image file upload with preview capability'}
                        {field.type === 'video' && 'Video file upload'}
                        {field.type === 'file' && 'File attachment upload (PDF, ZIP, DOC)'}
                        {field.type === 'select' && 'Selectable option from dropdown menu'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowEventForm(false)}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={eventSaving}>{eventSaving ? 'Saving...' : eventEditing ? 'Update Event' : 'Add Event'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegsModal && selectedEventForRegs && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={() => setShowRegsModal(false)}>
          <div className="admin-dash__modal admin-dash__modal--large" onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <div>
                <h2>Registrations</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, marginTop: 4 }}>{selectedEventForRegs.title}</p>
              </div>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowRegsModal(false)}><X size={20} /></button>
            </div>
            
            {regsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading registrations...</div>
            ) : (
              <div className="admin-dash__table-wrap" style={{ marginTop: 20, maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="admin-dash__table">
                  <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 10 }}>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegs.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 20 }}>No one has registered yet.</td></tr>
                    ) : eventRegs.map(reg => {
                      const hasExtras = Array.isArray(reg.customAnswers) && reg.customAnswers.length > 0;
                      const isExpanded = expandedRegId === reg.id;
                      return (
                        <React.Fragment key={reg.id}>
                          <tr>
                            <td style={{ width: 30 }}>
                              {hasExtras && (
                                <button
                                  type="button"
                                  className="admin-dash__icon-btn"
                                  onClick={() => setExpandedRegId(isExpanded ? null : reg.id)}
                                  title={isExpanded ? 'Hide details' : 'Show details'}
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                            </td>
                            <td>{reg.name}</td>
                            <td className="admin-dash__mono">{reg.rollNumber}</td>
                            <td style={{ color: 'rgba(255,255,255,0.6)' }}>{reg.email.replace('@kluniversity.in', '')}</td>
                            <td>{reg.role || 'Participant'}</td>
                            <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                          </tr>
                          {isExpanded && hasExtras && (
                            <tr>
                              <td colSpan="6" style={{ background: 'rgba(255,255,255,0.03)', padding: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                  {reg.customAnswers.map((a, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
                                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{a.label}</div>
                                      {a.type === 'image' && Array.isArray(a.files) && a.files.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                                          {a.files.map((f, k) => (
                                            <a key={k} href={f.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                              <img src={f.url} alt={f.originalName} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {a.type === 'video' && Array.isArray(a.files) && a.files.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          {a.files.map((f, k) => (
                                            <a key={k} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#71C4FF' }}>
                                              <FileVideo size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                              {f.originalName || 'video'}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {a.type === 'file' && Array.isArray(a.files) && a.files.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          {a.files.map((f, k) => (
                                            <a key={k} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#71C4FF' }}>
                                              <FileText size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                              {f.originalName || 'file'}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {a.type === 'link' && Array.isArray(a.workLinks) && a.workLinks.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          {a.workLinks.map((l, k) => (
                                            <a key={k} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#71C4FF' }}>
                                              <Link2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                              {l.title || l.url}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {!['image', 'video', 'file', 'link'].includes(a.type) && (
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                          {a.value || <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
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
            
            <div className="admin-dash__modal-actions" style={{ marginTop: 24 }}>
              <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowRegsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SelectOptionsEditor({ options, onChange }) {
  const [draft, setDraft] = React.useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (options.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...options, value]);
    setDraft('');
  };

  const remove = (idx) => onChange(options.filter((_, i) => i !== idx));

  const update = (idx, value) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
        Dropdown Menu Options
      </div>
      {options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', minWidth: 20, textAlign: 'right' }}>{i + 1}.</span>
              <input
                type="text"
                className="admin-dash__input"
                style={{ height: 34, fontSize: '0.8rem' }}
                value={opt}
                onChange={(e) => update(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                type="button"
                className="admin-dash__icon-btn admin-dash__icon-btn--danger"
                style={{ padding: 7 }}
                onClick={() => remove(i)}
                title="Remove option"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="admin-dash__input"
          style={{ height: 34, fontSize: '0.8rem' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type an option and press Enter..."
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="admin-dash__save-btn"
          style={{ padding: '0 14px', height: 34, fontSize: '0.78rem', whiteSpace: 'nowrap', opacity: draft.trim() ? 1 : 0.5 }}
        >
          <PlusIcon size={13} style={{ marginRight: 4 }} /> Add Option
        </button>
      </div>
    </div>
  );
}
