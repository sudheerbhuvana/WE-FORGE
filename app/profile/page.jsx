'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Mail, Hash, Calendar, Edit3, Save, X, LogOut, ChevronRight, Camera, Shield, Code, Search, ExternalLink, Package, Github, Linkedin, Send, FolderGit2, Plus, Trash2, ImagePlus, Link2, GraduationCap, School, Award, BadgeCheck, Trophy, Download } from 'lucide-react';
import './page.css';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', skills: '', telegram: '', github: '', linkedin: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [mRes, eRes] = await Promise.all([
        fetch('/api/members/me'),
        fetch('/api/members/me/registrations')
      ]);
      const mData = await mRes.json();
      const eData = await eRes.json();
      console.log('[Profile] Fetched member:', mData);

      // Same default as the public API: KLEF B.Tech is auto-seeded until the
      // member has added any school of their own.
      const userSchools = Array.isArray(mData.schools) ? mData.schools : [];
      const schools = userSchools.length > 0 ? userSchools : [{
          _id: 'default-klef',
          level: 'B.Tech',
          name: 'KLEF',
          boardOrUni: 'Koneru Lakshmaiah Education Foundation',
          year: '',
          readonly: true,
      }];

      setMember({ ...mData, schools });
      setEvents(eData);
      setEditForm({
        bio: mData.bio || '',
        skills: (mData.skills || []).join(', '),
        telegram: mData.telegram || '',
        github: mData.github || '',
        linkedin: mData.linkedin || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('[DEBUG] handleSave CALLED');
    console.log('[DEBUG] editForm state:', editForm);
    setSaving(true);
    try {
      const res = await fetch('/api/members/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: editForm.bio.trim(),
          telegram: editForm.telegram.trim(),
          github: editForm.github.trim(),
          linkedin: editForm.linkedin.trim(),
          skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        const updated = await res.json();
        console.log('[Profile] Update response:', updated);
        alert("Profile saved successfully!");
        setMember(updated);
        setIsEditing(false);
      } else {
        const errData = await res.json();
        console.error('[Profile] Update error data:', errData);
        alert("Server error: " + (errData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save error:', err);
      alert("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/members/me', {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        setMember(prev => ({ ...prev, photoUrl: updated.photoUrl }));
        alert('Profile picture updated successfully!');
      } else {
        const err = await res.json();
        alert('Failed to upload picture: ' + (err.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!member) return null;

  const domain = member.domain || 'General';
  const isElite = domain === 'Zero Order' || domain === 'Advisor';

  return (
    <div className={`profile-container ${isElite ? 'profile-container--elite' : ''}`}>
      <div className="profile-header">
        <div className="profile-header__info">
          <div
            className={`profile-avatar ${uploadingPhoto ? 'profile-avatar--uploading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            title="Click to update profile picture"
          >
            <img
              src={member.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
              alt={member.name}
              width={120}
              height={120}
              loading="lazy"
            />
            <div className="profile-avatar-overlay">
              {uploadingPhoto ? (
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>Uploading...</span>
              ) : (
                <Camera size={22} color="#fff" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <h1>{member.name}</h1>
            <p className="profile-role">{member.role} • {member.department}</p>
          </div>
        </div>
        <div className="profile-actions">
          {isElite && (
            <button onClick={() => router.push('/admin/dashboard')} className="edit-btn" style={{ marginRight: 12 }}>
              <Shield size={16} /> Manage Club (Admin)
            </button>
          )}
          <button onClick={() => signOut()} className="logout-btn">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Info */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Personal Information</h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="edit-btn"><Edit3 size={14}/> Edit</button>
            ) : (
              <div className="edit-actions">
                <button onClick={handleSave} disabled={saving} className="save-btn"><Save size={14}/> {saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setIsEditing(false)} className="cancel-btn"><X size={14}/></button>
              </div>
            )}
          </div>

          <div className="info-list">
            <div className="info-item">
              <Mail size={16} /> <span>{member.email}</span>
            </div>
            <div className="info-item">
              <Hash size={16} /> <span>{member.rollNumber}</span>
            </div>
            {member.github && (
              <a href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer" className="info-item info-item--link">
                <Github size={16} /> <span>{member.github}</span>
              </a>
            )}
            {member.linkedin && (
              <a href={`https://linkedin.com/in/${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="info-item info-item--link">
                <Linkedin size={16} /> <span>{member.linkedin}</span>
              </a>
            )}
          </div>

          <div className="bio-box">
            <label>Bio</label>
            {isEditing ? (
              <textarea 
                value={editForm.bio} 
                onChange={e => setEditForm({...editForm, bio: e.target.value})}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p>{member.bio || 'No bio added yet.'}</p>
            )}
          </div>

          <div className="skills-box">
            <label>Skills (comma separated)</label>
            {isEditing ? (
              <input 
                value={editForm.skills} 
                onChange={e => setEditForm({...editForm, skills: e.target.value})}
                placeholder="React, Design, Python..."
              />
            ) : (
              <div className="skill-tags">
                {member.skills?.map(s => <span key={s} className="skill-tag">{s}</span>)}
                {(!member.skills || member.skills.length === 0) && <span className="empty">No skills listed.</span>}
              </div>
            )}
          </div>

          <div className="skills-box" style={{ marginTop: '24px' }}>
            <label><GraduationCap size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Academic</label>
            <AcademicEditor
              cgpas={member.cgpas || []}
              schools={member.schools || []}
              onAddedCgpa={(c) => setMember((m) => ({ ...m, cgpas: [...(m.cgpas || []), c] }))}
              onRemovedCgpa={(id) => setMember((m) => ({ ...m, cgpas: (m.cgpas || []).filter((x) => x._id !== id) }))}
              onAddedSchool={(s) => setMember((m) => ({ ...m, schools: [...(m.schools || []), s] }))}
              onRemovedSchool={(id) => setMember((m) => ({ ...m, schools: (m.schools || []).filter((x) => x._id !== id) }))}
            />
          </div>

          {isEditing && (
            <div className="social-edit-box" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Social Profiles</h3>
              <div className="social-field">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Telegram Username</label>
                <input
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '0.9rem' }}
                  value={editForm.telegram}
                  onChange={e => setEditForm({...editForm, telegram: e.target.value})}
                  placeholder="e.g. johndoe"
                />
              </div>
              <div className="social-field">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>GitHub Username</label>
                <input
                  autoComplete="username"
                  spellCheck={false}
                  inputMode="text"
                  style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '0.9rem' }}
                  value={editForm.github}
                  onChange={e => setEditForm({...editForm, github: e.target.value})}
                  placeholder="e.g. johndoe"
                />
              </div>
              <div className="social-field">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>LinkedIn ID</label>
                <input
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: '8px', width: '100%', fontSize: '0.9rem' }}
                  value={editForm.linkedin}
                  onChange={e => setEditForm({...editForm, linkedin: e.target.value})}
                  placeholder="e.g. john-doe"
                />
              </div>
            </div>
          )}
        </div>

        {/* Events */}
        <div className="profile-section">
          <div className="section-header">
            <h2>My Registrations</h2>
            <span className="count-badge">{events.length} Events</span>
          </div>
          
          <div className="events-list">
            {events.length === 0 ? (
              <div className="empty-state">
                <p>You haven't registered for any events yet.</p>
                <button onClick={() => router.push('/events')} className="browse-btn">Browse Events <ChevronRight size={14}/></button>
              </div>
            ) : (
              events.map((event) => {
                const roleLabel = {
                  winner: '🏆 1st Place (Winner)',
                  runner_up: '🥈 2nd Place (Runner-Up)',
                  third_place: '🥉 3rd Place',
                  participant: 'Participant',
                }[event.eventRole] || 'Participant';

                return (
                  <div key={event.id} className="reg-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 10 }}>
                    <div className="reg-info">
                      <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>{event.eventTitle}</h4>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
                        <span>Registered: {new Date(event.registeredAt || event.eventDate).toLocaleDateString()}</span>
                        {event.eventRole && event.eventRole !== 'participant' && (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{roleLabel}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {event.attendance === 'present' ? (
                        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                          ✓ Attended
                        </span>
                      ) : event.attendance === 'absent' ? (
                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                          ✕ Absent
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem' }}>
                          Registered
                        </span>
                      )}

                      {event.certificateId ? (
                        <a
                          href={`/api/certificates/${event.certificateId}/download?token=${event.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="browse-btn"
                          style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}
                        >
                          <Download size={14} /> Download Certificate PDF
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Projects — editable on the private profile page */}
        <ProjectsEditor
          projects={member.projects || []}
          onAdded={(p) => setMember((m) => ({ ...m, projects: [...(m.projects || []), p] }))}
          onRemoved={(id) => setMember((m) => ({
            ...m,
            projects: (m.projects || []).filter((p) => p._id !== id),
          }))}
        />

        {/* Achievements — editable on the private profile page */}
        <AchievementsEditor
          achievements={member.achievements || []}
          onAdded={(a) => setMember((m) => ({ ...m, achievements: [...(m.achievements || []), a] }))}
          onRemoved={(id) => setMember((m) => ({
            ...m,
            achievements: (m.achievements || []).filter((a) => a._id !== id),
          }))}
        />

        {/* Certifications — editable on the private profile page */}
        <CertificationsEditor
          certifications={member.certifications || []}
          onAdded={(c) => setMember((m) => ({ ...m, certifications: [...(m.certifications || []), c] }))}
          onRemoved={(id) => setMember((m) => ({
            ...m,
            certifications: (m.certifications || []).filter((c) => c._id !== id),
          }))}
        />
      </div>
    </div>
  );
}

// ── Projects editor (private profile) ─────────────────────
function ProjectsEditor({ projects, onAdded, onRemoved }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState('');
  const fileInputRef = useRef(null);

  const reset = () => {
    setTitle(''); setLink(''); setDescription('');
    setImageFile(null); setImagePreview(''); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('link', link.trim());
      if (imageFile) fd.append('image', imageFile);

      const res = await fetch('/api/members/me/projects', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      onAdded(created);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this project from your profile?')) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/members/me/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      onRemoved(id);
    } catch (err) {
      alert(err.message || 'Could not remove project');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="profile-section profile-projects-section">
      <div className="section-header">
        <h2><FolderGit2 size={16} /> My Projects</h2>
        <button
          type="button"
          className="edit-btn"
          onClick={() => { setShowForm((s) => !s); setError(''); }}
          aria-expanded={showForm}
        >
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add project</>}
        </button>
      </div>

      {showForm && (
        <form className="profile-projects-form" onSubmit={handleSubmit}>
          <div className="profile-projects-field">
            <label>Project title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stackryze DNS"
              maxLength={120}
              required
            />
          </div>

          <div className="profile-projects-field">
            <label><Link2 size={12}/> Project link</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/you/project"
            />
          </div>

          <div className="profile-projects-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it does, what you built, what stack…"
              rows={3}
              maxLength={400}
            />
          </div>

          <div className="profile-projects-field">
            <label>Cover image</label>
            <div className="profile-projects-image-row">
              <button
                type="button"
                className="profile-projects-image-pick"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" />
                ) : (
                  <>
                    <ImagePlus size={20} />
                    <span>Choose image</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onPickImage}
                hidden
              />
              {imagePreview && (
                <button
                  type="button"
                  className="profile-projects-image-clear"
                  onClick={() => { setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {error && <p className="profile-projects-error" role="alert">{error}</p>}

          <div className="profile-projects-form-actions">
            <button type="submit" className="save-btn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add project'}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Add one to showcase it on your public profile.</p>
        </div>
      ) : (
        <div className="profile-projects-grid">
          {projects.map((p) => (
            <div key={p._id} className="profile-project-card">
              {p.imageUrl ? (
                <div className="profile-project-card__cover">
                  <img src={p.imageUrl} alt="" loading="lazy" />
                </div>
              ) : (
                <div className="profile-project-card__cover profile-project-card__cover--placeholder">
                  <FolderGit2 size={22} />
                </div>
              )}
              <div className="profile-project-card__body">
                <h4 className="profile-project-card__title">
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noopener noreferrer">
                      {p.title}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    p.title
                  )}
                </h4>
                {p.description && (
                  <p className="profile-project-card__desc">{p.description}</p>
                )}
              </div>
              <button
                type="button"
                className="profile-project-card__remove"
                onClick={() => handleRemove(p._id)}
                disabled={removingId === p._id}
                aria-label={`Remove ${p.title}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Achievements editor (private profile) ─────────────────
function AchievementsEditor({ achievements, onAdded, onRemoved }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setTitle(''); setIssuer(''); setDate(''); setLink(''); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/members/me/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, issuer, date, link }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      onAdded(created);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this achievement?')) return;
    try {
      const res = await fetch(`/api/members/me/achievements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      onRemoved(id);
    } catch (err) {
      alert(err.message || 'Could not remove');
    }
  };

  return (
    <div className="profile-section profile-projects-section">
      <div className="section-header">
        <h2><Trophy size={16} /> Achievements</h2>
        <button type="button" className="edit-btn" onClick={() => { setShowForm((s) => !s); setError(''); }}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add achievement</>}
        </button>
      </div>

      {showForm && (
        <form className="profile-projects-form" onSubmit={handleSubmit}>
          <div className="profile-projects-field">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Smart India Hackathon Winner" maxLength={160} required />
          </div>
          <div className="profile-projects-field">
            <label>Issuer / Organiser</label>
            <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. AICTE, Government of India" />
          </div>
          <div className="profile-projects-field" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label>Date</label>
              <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. Mar 2026" />
            </div>
            <div>
              <label><Link2 size={12}/> Link</label>
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          {error && <p className="profile-projects-error" role="alert">{error}</p>}
          <div className="profile-projects-form-actions">
            <button type="submit" className="save-btn" disabled={submitting}>{submitting ? 'Saving…' : 'Add achievement'}</button>
          </div>
        </form>
      )}

      {achievements.length === 0 ? (
        <div className="empty-state"><p>No achievements added yet.</p></div>
      ) : (
        <ul className="profile-resume-list">
          {achievements.map((a) => (
            <li key={a._id} className="profile-resume-item">
              <div className="profile-resume-icon" aria-hidden="true"><Trophy size={16} /></div>
              <div className="profile-resume-body">
                <h4 className="profile-resume-title">
                  {a.link ? <a href={a.link} target="_blank" rel="noopener noreferrer">{a.title} <ExternalLink size={11} /></a> : a.title}
                </h4>
                <p className="profile-resume-meta">
                  {a.issuer && <span>{a.issuer}</span>}
                  {a.issuer && a.date && <span className="dot">·</span>}
                  {a.date && <span>{a.date}</span>}
                </p>
              </div>
              <button type="button" className="profile-project-card__remove" onClick={() => handleRemove(a._id)} aria-label={`Remove ${a.title}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Certifications editor (private profile) ───────────────
function CertificationsEditor({ certifications, onAdded, onRemoved }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issued, setIssued] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setIssuer(''); setIssued(''); setCredentialUrl(''); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/members/me/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, issuer, issued, credentialUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      onAdded(created);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this certification?')) return;
    try {
      const res = await fetch(`/api/members/me/certifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      onRemoved(id);
    } catch (err) {
      alert(err.message || 'Could not remove');
    }
  };

  return (
    <div className="profile-section profile-projects-section">
      <div className="section-header">
        <h2><BadgeCheck size={16} /> Certifications</h2>
        <button type="button" className="edit-btn" onClick={() => { setShowForm((s) => !s); setError(''); }}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add certification</>}
        </button>
      </div>

      {showForm && (
        <form className="profile-projects-form" onSubmit={handleSubmit}>
          <div className="profile-projects-field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AWS Certified Solutions Architect" maxLength={160} required />
          </div>
          <div className="profile-projects-field">
            <label>Issuer</label>
            <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Amazon Web Services" />
          </div>
          <div className="profile-projects-field" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label>Issued</label>
              <input type="text" value={issued} onChange={(e) => setIssued(e.target.value)} placeholder="e.g. Jan 2026" />
            </div>
            <div>
              <label><Link2 size={12}/> Credential URL</label>
              <input type="url" value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          {error && <p className="profile-projects-error" role="alert">{error}</p>}
          <div className="profile-projects-form-actions">
            <button type="submit" className="save-btn" disabled={submitting}>{submitting ? 'Saving…' : 'Add certification'}</button>
          </div>
        </form>
      )}

      {certifications.length === 0 ? (
        <div className="empty-state"><p>No certifications added yet.</p></div>
      ) : (
        <ul className="profile-resume-list">
          {certifications.map((c) => (
            <li key={c._id} className="profile-resume-item">
              <div className="profile-resume-icon" aria-hidden="true"><BadgeCheck size={16} /></div>
              <div className="profile-resume-body">
                <h4 className="profile-resume-title">
                  {c.credentialUrl ? <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer">{c.name} <ExternalLink size={11} /></a> : c.name}
                </h4>
                <p className="profile-resume-meta">
                  {c.issuer && <span>{c.issuer}</span>}
                  {c.issuer && c.issued && <span className="dot">·</span>}
                  {c.issued && <span>{c.issued}</span>}
                </p>
              </div>
              <button type="button" className="profile-project-card__remove" onClick={() => handleRemove(c._id)} aria-label={`Remove ${c.name}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Academic editor (repeatable CGPAs + Schools) ──────────
function AcademicEditor({ cgpas, schools, onAddedCgpa, onRemovedCgpa, onAddedSchool, onRemovedSchool }) {
  const [adding, setAdding] = useState(null); // 'cgpa' | 'school' | null

  // Local form state per active form
  const [cgpaLabel, setCgpaLabel] = useState('');
  const [cgpaValue, setCgpaValue] = useState('');
  const [cgpaScale, setCgpaScale] = useState('10');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolBoard, setSchoolBoard] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetCgpa = () => { setCgpaLabel(''); setCgpaValue(''); setCgpaScale('10'); setError(''); };
  const resetSchool = () => { setSchoolLevel(''); setSchoolName(''); setSchoolBoard(''); setSchoolYear(''); setError(''); };

  const submitCgpa = async (e) => {
    e.preventDefault();
    setError('');
    if (!cgpaValue.trim() || Number.isNaN(Number(cgpaValue))) {
      setError('Enter a numeric CGPA');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/members/me/cgpas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label: cgpaLabel, value: cgpaValue, scale: cgpaScale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      onAddedCgpa(created);
      resetCgpa();
      setAdding(null);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSchool = async (e) => {
    e.preventDefault();
    setError('');
    if (!schoolName.trim()) { setError('School name is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/members/me/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level: schoolLevel, name: schoolName, boardOrUni: schoolBoard, year: schoolYear }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const created = await res.json();
      onAddedSchool(created);
      resetSchool();
      setAdding(null);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (kind, id) => {
    if (!confirm(`Remove this ${kind === 'cgpa' ? 'CGPA' : 'school'} entry?`)) return;
    try {
      const res = await fetch(`/api/members/me/${kind === 'cgpa' ? 'cgpas' : 'schools'}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      if (kind === 'cgpa') onRemovedCgpa(id); else onRemovedSchool(id);
    } catch (err) {
      alert(err.message || 'Could not remove');
    }
  };

  return (
    <div className="profile-academic-editor">
      {/* CGPAs */}
      <div className="profile-academic-group">
        <div className="profile-academic-group__header">
          <h4>CGPAs</h4>
          {adding !== 'cgpa' && (
            <button type="button" className="profile-academic-add" onClick={() => { setAdding('cgpa'); resetCgpa(); }}>
              <Plus size={12} /> Add CGPA
            </button>
          )}
        </div>
        {cgpas.length === 0 ? (
          <p className="profile-academic-empty">No CGPA entries yet.</p>
        ) : (
          <ul className="profile-academic-list">
            {cgpas.map((c) => (
              <li key={c._id} className="profile-academic-chip">
                <span className="profile-academic-chip__value">{c.value}<span className="profile-academic-chip__scale">/{c.scale || 10}</span></span>
                {c.label && <span className="profile-academic-chip__label">{c.label}</span>}
                <button type="button" className="profile-academic-chip__remove" onClick={() => remove('cgpa', c._id)} aria-label="Remove CGPA">
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {adding === 'cgpa' && (
          <form className="profile-academic-form" onSubmit={submitCgpa}>
            <div className="profile-academic-form__row">
              <input value={cgpaLabel} onChange={(e) => setCgpaLabel(e.target.value)} placeholder="Label (e.g. Sem 4, Overall)" />
              <input value={cgpaValue} onChange={(e) => setCgpaValue(e.target.value)} placeholder="CGPA (e.g. 8.42)" type="number" step="0.01" min="0" max="10" required />
              <input value={cgpaScale} onChange={(e) => setCgpaScale(e.target.value)} placeholder="Scale" type="number" step="0.1" min="1" style={{ maxWidth: 80 }} />
            </div>
            {error && adding === 'cgpa' && <p className="profile-projects-error" role="alert">{error}</p>}
            <div className="profile-academic-form__actions">
              <button type="button" className="cancel-btn" onClick={() => { setAdding(null); setError(''); }}><X size={12}/> Cancel</button>
              <button type="submit" className="save-btn" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>

      {/* Schools */}
      <div className="profile-academic-group" style={{ marginTop: '16px' }}>
        <div className="profile-academic-group__header">
          <h4>Schools / Institutions</h4>
          {adding !== 'school' && (
            <button type="button" className="profile-academic-add" onClick={() => { setAdding('school'); resetSchool(); }}>
              <Plus size={12} /> Add school
            </button>
          )}
        </div>
        {schools.length === 0 ? (
          <p className="profile-academic-empty">No school entries yet.</p>
        ) : (
          <ul className="profile-academic-list profile-academic-list--stacked">
            {schools.map((s) => (
              <li key={s._id} className="profile-academic-row">
                <div className="profile-academic-row__body">
                  <strong>{s.name}</strong>
                  <span className="profile-academic-row__meta">
                    {s.level && <span>{s.level}</span>}
                    {s.level && s.boardOrUni && <span className="dot">·</span>}
                    {s.boardOrUni && <span>{s.boardOrUni}</span>}
                    {(s.level || s.boardOrUni) && s.year && <span className="dot">·</span>}
                    {s.year && <span>{s.year}</span>}
                  </span>
                </div>
                {s.readonly ? (
                  <span className="profile-academic-chip__readonly" title="Default — your university">default</span>
                ) : (
                  <button type="button" className="profile-academic-chip__remove" onClick={() => remove('school', s._id)} aria-label={`Remove ${s.name}`}>
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {adding === 'school' && (
          <form className="profile-academic-form" onSubmit={submitSchool}>
            <div className="profile-academic-form__row">
              <input value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)} placeholder="Level (e.g. Class XII, B.Tech)" />
              <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="School / Institution name" required />
            </div>
            <div className="profile-academic-form__row">
              <input value={schoolBoard} onChange={(e) => setSchoolBoard(e.target.value)} placeholder="Board / University (optional)" />
              <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="Year (e.g. 2022–2026)" />
            </div>
            {error && adding === 'school' && <p className="profile-projects-error" role="alert">{error}</p>}
            <div className="profile-academic-form__actions">
              <button type="button" className="cancel-btn" onClick={() => { setAdding(null); setError(''); }}><X size={12}/> Cancel</button>
              <button type="submit" className="save-btn" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
