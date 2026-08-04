'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Users, Edit3, Trash2, Calendar, CheckCircle, X } from 'lucide-react';
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
  accessType: 'public', allowedDomains: [], allowedMembers: [], roles: ['Participant', 'Volunteer', 'Organizer'], isRegistrationOpen: true
};

export default function EventsSection({ events, adminInfo, refreshData }) {
  const router = useRouter();

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventEditing, setEventEditing] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventDeleteConfirm, setEventDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  // Poster & Crop
  const [eventPosterPreview, setEventPosterPreview] = useState(null);
  const [posterBlob, setPosterBlob] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 16 / 9 });

  // Regs Modal
  const [showRegsModal, setShowRegsModal] = useState(false);
  const [selectedEventForRegs, setSelectedEventForRegs] = useState(null);
  const [eventRegs, setEventRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

  const openAddEvent = () => {
    setEventEditing(null);
    setEventForm(EMPTY_EVENT_FORM);
    setEventPosterPreview(null);
    setPosterBlob(null);
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
    });
    setEventPosterPreview(ev.posterUrl || null);
    setPosterBlob(null);
    setShowEventForm(true);
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
        if (Array.isArray(eventForm[key])) {
          formData.append(key, JSON.stringify(eventForm[key]));
        } else {
          formData.append(key, eventForm[key]);
        }
      });

      if (posterBlob) {
        formData.append('poster', posterBlob, 'poster.png');
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
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleEventSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{eventEditing ? 'Edit Event' : 'Add New Event'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowEventForm(false)}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Title *</label><input required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Description</label><textarea rows="3" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="What's this event about?" /></div>
              <div className="admin-dash__field"><label>Event Type</label><input value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} placeholder="e.g. Workshop, Seminar" /></div>
              <div className="admin-dash__field"><label>Points</label><input type="number" value={eventForm.points} onChange={e => setEventForm({ ...eventForm, points: Number(e.target.value) })} /></div>
              <div className="admin-dash__field"><label>Slots</label><input type="number" value={eventForm.slots} onChange={e => setEventForm({ ...eventForm, slots: Number(e.target.value) })} /></div>

              <div className="admin-dash__field">
                <label>Start Time *</label>
                <ModernDateTimePicker value={eventForm.startTime} onChange={val => setEventForm({ ...eventForm, startTime: val })} placeholder="Select Start Time" />
              </div>
              <div className="admin-dash__field">
                <label>End Time *</label>
                <ModernDateTimePicker value={eventForm.endTime} onChange={val => setEventForm({ ...eventForm, endTime: val })} placeholder="Select End Time" />
              </div>

              <div className="admin-dash__field admin-dash__field--full">
                <label>Venue</label>
                <input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="e.g. A Block Seminar Hall" />
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
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegs.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 20 }}>No one has registered yet.</td></tr>
                    ) : eventRegs.map(reg => (
                      <tr key={reg.id}>
                        <td>{reg.name}</td>
                        <td className="admin-dash__mono">{reg.rollNumber}</td>
                        <td style={{ color: 'rgba(255,255,255,0.6)' }}>{reg.email.replace('@kluniversity.in', '')}</td>
                        <td>{reg.role || 'Participant'}</td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
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
