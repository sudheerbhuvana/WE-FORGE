'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Calendar, Clock, MapPin, Users, Star, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useSession, signIn } from 'next-auth/react';
import eventService from '../../../src/services/eventService';
import BackButton from '../../../src/components/BackButton';
import './page.css';


const TYPE_COLORS = {
  workshop: '#3b82f6',
  hackathon: '#f59e0b',
  competition: '#ef4444',
  talk: '#8b5cf6',
  seminar: '#10b981',
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';


const EventDetailPage = () => {
  const { id: eventId } = useParams();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const { data: session } = useSession();
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPoster, setShowPoster] = useState(false);

  // Custom form fields
  const [formValues, setFormValues] = useState({});
  const [formFiles, setFormFiles] = useState({});
  const [formLinks, setFormLinks] = useState({});
  const [showFormModal, setShowFormModal] = useState(false);
  const [formError, setFormError] = useState('');

  const eventFields = event?.customFields || [];
  const hasCustomFields = eventFields.length > 0;

  useEffect(() => {
    setLoading(true);
    eventService.getAll()
      .then((events) => {
        const found = events.find(e =>
          e.id === eventId ||
          (e.title && e.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === eventId)
        );
        if (found) {
          setEvent(found);
          // Check if user is registered for THIS event
          if (session?.user?.email) {
            eventService.getRegistrations(found.id)
              .then(regs => {
                const userRoll = session.user.email.split('@')[0];
                const matched = regs.some(r => r.rollNumber === userRoll || r.email === session.user.email);
                setIsRegistered(matched);
              })
              .catch(err => console.error("Error checking registration:", err));
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId, session]);

  if (loading) {
    return (
      <div className="event-detail">
        <div className="event-detail__loading">Loading event...</div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="event-detail">
        <div className="event-detail__not-found">
          <div className="event-detail__not-found-icon"><Search size={48} /></div>
          <h2>Event Not Found</h2>
          <p>This event doesn't exist or may have been removed.</p>
          <BackButton />
        </div>
      </div>
    );
  }

  const alreadyRegistered = isRegistered;
  const slotsLeft = event.slots - event.registeredCount;
  const deadlinePast = new Date(event.registrationDeadline) < new Date();
    const now = new Date();
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const currentStatus = now > end ? 'ended' : now >= start ? 'ongoing' : 'upcoming';

    const isEnded = currentStatus === 'ended';

    // Access Control Logic
    let isAuthorized = true;
    let accessError = null;

    if (event.accessType === 'domain') {
      if (!session) {
        isAuthorized = false;
        accessError = 'Login to verify domain access';
      } else {
        // Backend will verify if the user's KLFORGE Team domain matches event's allowedDomains
        isAuthorized = true;
      }
    } else if (event.accessType === 'private') {
      if (!session) {
        isAuthorized = false;
        accessError = 'Login to verify guest list status';
      } else {
        const rollNumber = session.user.email.split('@')[0];
        isAuthorized = event.allowedMembers.includes(rollNumber);
        if (!isAuthorized) accessError = 'You are not on the guest list for this private event';
      }
    }

    const canRegister = !deadlinePast && slotsLeft > 0 && !isEnded && !alreadyRegistered && event.isRegistrationOpen !== false && isAuthorized;

  const btnLabel = alreadyRegistered
    ? 'Already Registered ✓'
    : !session
      ? 'Login to Register'
      : !isAuthorized
        ? 'Access Restricted'
        : (deadlinePast || event.isRegistrationOpen === false)
          ? 'Registration Closed'
          : slotsLeft === 0
            ? 'Fully Booked'
            : hasCustomFields
              ? 'Continue Registration →'
              : 'Register Now →';

  const handleOneClick = async () => {
    if (!session?.user) return;
    if (hasCustomFields) {
      setShowFormModal(true);
      setFormError('');
      return;
    }
    await submitRegistration();
  };

  const submitRegistration = async (customFieldsOverride) => {
    if (!session?.user) return;
    setSubmitting(true);
    setResult(null);
    setFormError('');
    try {
      const userData = {
        name: session.user.name,
        email: session.user.email,
        rollNumber: session.user.email.split('@')[0],
      };
      if (customFieldsOverride) {
        userData.customFields = customFieldsOverride.values || {};
        userData._files = customFieldsOverride.files || {};
      } else if (hasCustomFields) {
        userData.customFields = formValues;
        userData._files = formFiles;
      }
      await eventService.register(event.id, userData);
      setIsRegistered(true);
      setResult({ ok: true, msg: '✓ Registration Successful!' });
      setEvent(prev => ({ ...prev, registeredCount: prev.registeredCount + 1 }));
      setShowFormModal(false);
    } catch (err) {
      setResult({ ok: false, msg: err.message });
      if (hasCustomFields) setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const validateAndSubmitForm = async () => {
    setFormError('');
    const values = {};
    const files = {};
    const links = {};

    for (const f of eventFields) {
      if (f.type === 'image' || f.type === 'video' || f.type === 'file') {
        const fieldFiles = formFiles[f.id] || [];
        if (f.required && fieldFiles.length === 0) {
          setFormError(`${f.label} is required`);
          return;
        }
        if (fieldFiles.length > 0) {
          const maxBytes = (f.maxSizeMB || 10) * 1024 * 1024;
          for (const file of fieldFiles) {
            if (file.size > maxBytes) {
              setFormError(`${f.label}: file exceeds ${f.maxSizeMB}MB limit`);
              return;
            }
          }
          files[f.id] = fieldFiles;
        }
      } else if (f.type === 'link') {
        const fieldLinks = formLinks[f.id] || [];
        if (f.required && fieldLinks.length === 0) {
          setFormError(`${f.label} is required`);
          return;
        }
        if (fieldLinks.length > 0) {
          for (const l of fieldLinks) {
            if (!l.url || !l.url.trim()) {
              setFormError(`${f.label}: link URL is required`);
              return;
            }
          }
          links[f.id] = fieldLinks;
        }
      } else {
        const value = (formValues[f.id] ?? '').toString().trim();
        if (f.required && !value) {
          setFormError(`${f.label} is required`);
          return;
        }
        if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setFormError(`${f.label}: invalid email`);
          return;
        }
        if (f.type === 'select' && value && Array.isArray(f.options) && f.options.length > 0 && !f.options.includes(value)) {
          setFormError(`${f.label}: invalid selection`);
          return;
        }
        if (value) values[f.id] = value;
      }
    }

    await submitRegistration({ values, files, links: formLinks });
  };

  const updateFieldValue = (id, value) => setFormValues((prev) => ({ ...prev, [id]: value }));
  const updateFieldFiles = (id, files) => setFormFiles((prev) => ({ ...prev, [id]: files }));
  const updateFieldLinks = (id, links) => setFormLinks((prev) => ({ ...prev, [id]: links }));

  return (
    <div className="event-detail">
      <Helmet>
        <title>{event.title} - KLFORGE Events</title>
        <meta name="description" content={event.description || `Register for ${event.title} at KLFORGE.`} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description || `Join us for ${event.title}`} />
        {event.posterUrl && <meta property="og:image" content={event.posterUrl} />}
      </Helmet>

      <div className="event-detail__hero">
        <div className="event-detail__topbar">
          <BackButton to="/events" />
        </div>
        {event.posterUrl && (
          <>
            <div className="event-detail__poster-wrap" onClick={() => setShowPoster(true)}>
              <img src={event.posterUrl} alt={event.title} className="event-detail__poster" />
            </div>
            {showPoster && (
              <div className="event-poster-modal" onClick={() => setShowPoster(false)}>
                <div className="event-poster-modal__content" onClick={e => e.stopPropagation()}>
                  <img src={event.posterUrl} alt={event.title} className="event-poster-modal__img" />
                  <button className="event-poster-modal__close" onClick={() => setShowPoster(false)}>✕</button>
                </div>
              </div>
            )}
          </>
        )}
        <div className="event-detail__badges">
          <span
            className="event-detail__type-badge"
            style={{ background: TYPE_COLORS[event.type] || '#555' }}
          >
            {event.type}
          </span>
          <span className={`event-detail__status event-detail__status--${event.status}`}>
            {new Date(event.endTime) < new Date() ? 'Ended' : new Date(event.startTime) < new Date() ? 'Ongoing' : 'Upcoming'}
          </span>
        </div>
        <h1 className="event-detail__title">{event.title}</h1>
        {event.description && (
          <p className="event-detail__desc">{event.description}</p>
        )}
      </div>

      <div className="event-detail__meta-grid">
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label"><Calendar size={14} className="events-icon"/> Date</span>
          <span className="event-detail__meta-val">
            {new Date(event.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString() && (
              <> - {new Date(event.endTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label"><Clock size={14} className="events-icon"/> Time</span>
          <span className="event-detail__meta-val">
            {new Date(event.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            {new Date(event.startTime).toDateString() !== new Date(event.endTime).toDateString() && (
              <span style={{ fontSize: '0.8em', opacity: 0.6, display: 'block' }}>(Cross-day event)</span>
            )}
          </span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label"><Clock size={14} className="events-icon"/> Registration Deadline</span>
          <span className="event-detail__meta-val">{fmt(event.registrationDeadline)}</span>
        </div>
        {(event.venue || event.location) && (
          <div className="event-detail__meta-item">
            <span className="event-detail__meta-label"><MapPin size={14} className="events-icon"/> Venue</span>
            <span className="event-detail__meta-val">{event.venue || event.location}</span>
          </div>
        )}
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label"><Users size={14} className="events-icon"/> Slots</span>
          <span className={`event-detail__meta-val ${slotsLeft === 0 ? 'event-detail__meta-val--danger' : ''}`}>
            {slotsLeft > 0 ? `${slotsLeft} of ${event.slots} left` : 'Fully Booked'}
          </span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label"><Star size={14} className="events-icon"/> Points</span>
          <span className="event-detail__meta-val">{event.points || '—'}</span>
        </div>
      </div>

      {/* Registration Form Requirements */}
      {hasCustomFields && (
        <div className="event-detail__meta-grid" style={{ marginTop: 16 }}>
          <div style={{ gridColumn: '1 / -1', background: 'rgba(113,196,255,0.06)', border: '1px solid rgba(113,196,255,0.18)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71C4FF', marginBottom: 8, fontWeight: 600 }}>
              Registration Requirements
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {eventFields.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)' }}>
                  <span style={{ color: f.required ? '#5cdb95' : 'rgba(255,255,255,0.4)' }}>✓</span>
                  <span>{f.label}</span>
                  {f.required && <span style={{ fontSize: '0.7rem', color: '#ff8080', fontWeight: 600 }}>REQUIRED</span>}
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                    {f.type === 'image' && `Image${f.maxCount && f.maxCount > 1 ? ` (up to ${f.maxCount})` : ''}`}
                    {f.type === 'video' && 'Video'}
                    {f.type === 'file' && 'File'}
                    {f.type === 'link' && `${f.maxCount || 1} link${f.maxCount > 1 ? 's' : ''}`}
                    {f.type === 'text' && 'Text'}
                    {f.type === 'textarea' && 'Long text'}
                    {f.type === 'number' && 'Number'}
                    {f.type === 'email' && 'Email'}
                    {f.type === 'select' && 'Dropdown'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Registration area */}
      <div className="event-detail__reg-section">
        {result?.ok && (
          <div className="event-detail__reg-success">{result.msg}</div>
        )}
        {accessError && !result?.ok && (
          <div className="event-detail__reg-error" style={{ marginBottom: 20, textAlign: 'center' }}>
            {accessError}
          </div>
        )}
        {!result?.ok && (
          !isEnded ? (
            <button
              className={`event-detail__reg-btn ${!canRegister && session ? 'event-detail__reg-btn--disabled' : ''} ${alreadyRegistered ? 'event-detail__reg-btn--done' : ''}`}
              onClick={() => {
                if (alreadyRegistered) return;
                if (session) {
                  if (!canRegister) return;
                  handleOneClick();
                } else {
                  signIn('microsoft'); // Or just signIn() to show options
                }
              }}
              disabled={(submitting) || (session && !canRegister)}
            >
              {submitting ? 'Registering...' : btnLabel}
            </button>
          ) : (
            <button className="event-detail__reg-btn event-detail__reg-btn--disabled" disabled>
              Event Ended
            </button>
          )
        )}
      </div>

      {/* Custom registration form modal */}
      {showFormModal && (
        <div className="event-poster-modal" onClick={() => !submitting && setShowFormModal(false)}>
          <div
            className="event-poster-modal__content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', width: '92vw', padding: 24, textAlign: 'left' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Complete Registration</h2>
              <button
                className="event-poster-modal__close"
                onClick={() => setShowFormModal(false)}
                disabled={submitting}
                aria-label="Close"
              >✕</button>
            </div>
            <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
              Please fill in the required details for <strong>{event.title}</strong>.
            </p>

            {formError && (
              <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8080', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {eventFields.map((f) => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', marginBottom: 6, fontWeight: 500 }}>
                    {f.label} {f.required && <span style={{ color: '#ff8080' }}>*</span>}
                  </label>

                  {f.type === 'text' && (
                    <input
                      type="text"
                      value={formValues[f.id] || ''}
                      onChange={(e) => updateFieldValue(f.id, e.target.value)}
                      placeholder={f.placeholder || ''}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'inherit', fontSize: '0.92rem' }}
                    />
                  )}

                  {f.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={formValues[f.id] || ''}
                      onChange={(e) => updateFieldValue(f.id, e.target.value)}
                      placeholder={f.placeholder || ''}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'inherit', fontSize: '0.92rem', resize: 'vertical' }}
                    />
                  )}

                  {f.type === 'number' && (
                    <input
                      type="number"
                      value={formValues[f.id] || ''}
                      onChange={(e) => updateFieldValue(f.id, e.target.value)}
                      placeholder={f.placeholder || ''}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'inherit', fontSize: '0.92rem' }}
                    />
                  )}

                  {f.type === 'email' && (
                    <input
                      type="email"
                      value={formValues[f.id] || ''}
                      onChange={(e) => updateFieldValue(f.id, e.target.value)}
                      placeholder={f.placeholder || 'you@example.com'}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'inherit', fontSize: '0.92rem' }}
                    />
                  )}

                  {f.type === 'select' && (
                    <select
                      value={formValues[f.id] || ''}
                      onChange={(e) => updateFieldValue(f.id, e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'inherit', fontSize: '0.92rem' }}
                    >
                      <option value="">— Select —</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {f.type === 'link' && (
                    <LinkFieldEditor
                      links={formLinks[f.id] || []}
                      onChange={(links) => updateFieldLinks(f.id, links)}
                      maxCount={f.maxCount || 1}
                      placeholder={f.placeholder || ''}
                    />
                  )}

                  {(f.type === 'image' || f.type === 'video' || f.type === 'file') && (
                    <FileFieldEditor
                      field={f}
                      files={formFiles[f.id] || []}
                      onChange={(files) => updateFieldFiles(f.id, files)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setShowFormModal(false)}
                disabled={submitting}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={validateAndSubmitForm}
                disabled={submitting}
                className="event-detail__reg-btn"
                style={{ marginTop: 0 }}
              >
                {submitting ? 'Submitting...' : 'Complete Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function LinkFieldEditor({ links, onChange, maxCount, placeholder }) {
  const add = () => {
    if (links.length >= maxCount) return;
    onChange([...links, { title: '', url: '' }]);
  };
  const update = (idx, patch) => {
    const next = [...links];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const remove = (idx) => onChange(links.filter((_, i) => i !== idx));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6 }}>
          <input
            type="text"
            placeholder="Label (e.g. GitHub)"
            value={l.title}
            onChange={(e) => update(i, { title: e.target.value })}
            style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'inherit', fontSize: '0.85rem' }}
          />
          <input
            type="url"
            placeholder={placeholder || 'https://…'}
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'inherit', fontSize: '0.85rem' }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{ padding: '0 10px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8080', borderRadius: 6, cursor: 'pointer' }}
          >✕</button>
        </div>
      ))}
      {links.length < maxCount && (
        <button
          type="button"
          onClick={add}
          style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'rgba(113,196,255,0.08)', border: '1px solid rgba(113,196,255,0.25)', color: '#71C4FF', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem' }}
        >
          + Add link
        </button>
      )}
    </div>
  );
}

function FileFieldEditor({ field, files, onChange }) {
  const addFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    const maxCount = field.maxCount || 1;
    const combined = [...files, ...list].slice(0, maxCount);
    onChange(combined);
    e.target.value = '';
  };
  const remove = (idx) => onChange(files.filter((_, i) => i !== idx));
  const maxMB = field.maxSizeMB || 10;
  const accept =
    field.type === 'image' ? 'image/*' :
    field.type === 'video' ? 'video/*' :
    '*/*';
  const maxCount = field.maxCount || 1;
  return (
    <div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: '0.85rem' }}>
              {field.type === 'image' && f.type?.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 4, fontSize: '0.8rem' }}>
                  {field.type === 'video' ? '🎬' : '📄'}
                </span>
              )}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => remove(i)}
                style={{ padding: '0 8px', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8080', borderRadius: 4, cursor: 'pointer' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      {files.length < maxCount && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(113,196,255,0.08)', border: '1px dashed rgba(113,196,255,0.3)', color: '#71C4FF', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="file" accept={accept} onChange={addFiles} multiple={maxCount > 1} style={{ display: 'none' }} />
          + Add {field.type} (max {maxMB} MB, {maxCount - files.length} left)
        </label>
      )}
    </div>
  );
}

export default EventDetailPage;
