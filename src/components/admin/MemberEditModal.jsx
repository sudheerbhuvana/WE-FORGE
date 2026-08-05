'use client';

/**
 * MemberEditModal — handles add + edit of a Member.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │ IDENTITY                                       │
 *   │   Name, Roll Number, Email, Department         │
 *   │ ROLE & PERMISSIONS                             │
 *   │   Primary Domain, Primary Role, + Roles Matrix │
 *   │ PROFILE                                        │
 *   │   Color, Status, Description, Bio, Skills      │
 *   │ CONTACT                                        │
 *   │   Telegram, GitHub, LinkedIn                    │
 *   │ PHOTO                                          │
 *   │   [Current photo] [Upload] [Remove]            │
 *   │ DANGER ZONE (edit only, elite only)            │
 *   │   Suspend Account                              │
 *   └────────────────────────────────────────────────┘
 *
 * Permissions:
 *   - Elite: can edit any field (including role/domain, suspend)
 *   - Domain head: can edit members in their own domain — most fields,
 *     but role/domain editing is scoped to their domain only
 *   - Non-head: cannot edit anyone but themselves via /api/members/me
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X, Camera, Upload, Trash2, Plus, Save, AlertTriangle,
    User, Mail, Hash, Briefcase, Shield, Tag, Github, Linkedin, Send, Palette,
} from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ── Constants ──────────────────────────────────────────────

const ELITE_TIER_ROLES = [
    'Head of the Department',
    'Alternate Head of Department',
    'President',
    'Chief Secretary',
    'Treasurer',
];

const DEFAULT_ROLE_OPTIONS = ['Chief', 'Lead', 'Co-Lead', 'Core Member', 'Associate', 'Student'];

const STATUS_OPTIONS = ['Online', 'Away', 'Busy', 'Offline'];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

const EMPTY = {
    name: '',
    role: 'Student',
    domain: 'General',
    roles: [],          // [{domain, role}]
    rollNumber: '',
    email: '',
    description: '',
    bio: '',
    skills: '',
    department: '',
    telegram: '',
    github: '',
    linkedin: '',
    status: 'Online',
    color: '#71C4FF',
    customRoleId: '',
    isSuspended: false,
    photoUrl: '',
};

// ── Helpers ────────────────────────────────────────────────

function roleOptionsForDomain(domain, domainsList) {
    if (!domain) return DEFAULT_ROLE_OPTIONS;
    if (domain === 'Zero Order') return ELITE_TIER_ROLES;
    if (domain === 'Advisor') return ['Advisor'];
    const found = domainsList.find(d => d.name === domain);
    if (!found) return DEFAULT_ROLE_OPTIONS;

    // merge admin roles (Chief/Lead/Co-Lead) + general tiers
    const set = new Set([...(found.adminRoles || []), ...DEFAULT_ROLE_OPTIONS]);
    return Array.from(set);
}

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

function validate(form, actorIsElite, actorDomain) {
    const errors = {};
    if (!form.name?.trim()) errors.name = 'Required';
    if (!form.rollNumber?.trim()) errors.rollNumber = 'Required';
    else if (!/^\d{6,}$/.test(form.rollNumber.trim())) errors.rollNumber = 'Use a numeric roll number';

    if (!actorIsElite) {
        // head of a domain can edit members in their own domain — role/domain not freely changeable
        if (form.domain !== actorDomain && actorDomain) {
            errors.domain = `You can only edit members in ${actorDomain}`;
        }
    }
    return errors;
}

// ── Component ──────────────────────────────────────────────

// Build the form state from a member doc (or empty for "add").
function buildInitialForm(member) {
    if (!member) return EMPTY;
    return {
        ...EMPTY,
        ...member,
        // Defensive copies — fields that can be undefined/null in the doc.
        name: member.name || '',
        role: member.role || 'Student',
        domain: member.domain || 'General',
        rollNumber: member.rollNumber || '',
        email: member.email || (member.rollNumber ? `${member.rollNumber}@kluniversity.in` : ''),
        description: member.description || '',
        bio: member.bio || '',
        department: member.department || '',
        telegram: member.telegram || '',
        github: member.github || '',
        linkedin: member.linkedin || '',
        status: member.status || 'Online',
        color: member.color || '#71C4FF',
        customRoleId: member.customRoleId || '',
        photoUrl: member.photoUrl || '',
        isSuspended: !!member.isSuspended,
        skills: Array.isArray(member.skills) ? member.skills.join(', ') : (member.skills || ''),
        roles: Array.isArray(member.roles) ? member.roles.map(r => ({ ...r })) : [],
    };
}

export default function MemberEditModal({
    open,
    onClose,
    onSubmit,
    member,
    domainsList = [],
    actor,                // { isElite, domain, memberId, name }
    saving = false,
}) {
    // ALL hooks must run unconditionally on every render — no early `return null`
    // before declaring hooks. We initialise lazily from `member` so the values
    // are pre-filled on the first render itself.
    const [form, setForm] = useState(() => buildInitialForm(member));
    const [customRoleOptions, setCustomRoleOptions] = useState([]);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetch('/api/roles')
            .then(r => r.json())
            .then(d => { if (d.success) setCustomRoleOptions(d.roles || []); })
            .catch(() => {});
    }, []);
    const [touched, setTouched] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [crop, setCrop] = useState(undefined);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const imgRef = useRef(null);

    const isEdit = Boolean(member);
    const isElite = !!actor?.isElite;
    const actorDomain = actor?.domain || '';
    const canEditRoles = isElite;
    const canSuspend = isElite;

    // Re-sync state whenever the modal target changes.
    // We track the *identity* of `member` (not just the object) so reopening with
    // a different member always re-initialises everything, even if React batches
    // a stale render.
    const memberKey = member?.id ?? (member ? JSON.stringify(member) : 'add');
    const prevMemberKey = useRef(memberKey);
    useEffect(() => {
        if (!open) return;
        if (prevMemberKey.current === memberKey) return;
        prevMemberKey.current = memberKey;

        setForm(buildInitialForm(member));
        setErrors({});
        setTouched({});
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setCrop(undefined);
        setCompletedCrop(null);
        setRemovePhoto(false);
        setSubmitError('');
    }, [open, memberKey, member]);

    const setField = (name, value) => {
        setForm(prev => {
            const next = { ...prev, [name]: value };
            // If we change domain, reset primary role to a sensible default for that domain
            if (name === 'domain') {
                if (value === 'Zero Order') next.role = 'President';
                else if (value === 'Advisor') next.role = 'Advisor';
                else if (value === 'General') next.role = 'Student';
                else next.role = 'Core Member';
            }
            // Auto-derive KL email when roll changes
            if (name === 'rollNumber' && /^\d{6,}$/.test(String(value || '').trim())) {
                next.email = `${String(value).trim()}@kluniversity.in`;
            }
            return next;
        });
    };

    const onImageLoad = (e) => {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const size = Math.min(width, height);
        setCrop({
            unit: 'px',
            x: Math.round((width - size) / 2),
            y: Math.round((height - size) / 2),
            width: Math.round(size),
            height: Math.round(size),
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setSubmitError('Photo must be JPEG, PNG, or WebP');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setSubmitError('Photo must be 5 MB or less');
            return;
        }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setRemovePhoto(false);
        setCrop(undefined);
        setCompletedCrop(null);
        setSubmitError('');
    };

    const removeExistingPhoto = () => {
        setRemovePhoto(true);
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setCompletedCrop(null);
    };

    const addDomainRole = () => {
        setForm(prev => ({
            ...prev,
            roles: [...(prev.roles || []), { domain: prev.domain || '', role: 'Core Member' }],
        }));
    };

    const updateDomainRole = (i, field, value) => {
        setForm(prev => {
            const list = [...(prev.roles || [])];
            list[i] = { ...list[i], [field]: value };
            return { ...prev, roles: list };
        });
    };

    const removeDomainRole = (i) => {
        setForm(prev => ({
            ...prev,
            roles: (prev.roles || []).filter((_, idx) => idx !== i),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        const validationErrors = validate(form, isElite, actorDomain);
        setErrors(validationErrors);
        setTouched({ name: true, rollNumber: true, domain: true });
        if (Object.keys(validationErrors).length > 0) return;

        // Build FormData
        const fd = new FormData();
        const skillsArray = String(form.skills || '')
            .split(',').map(s => s.trim()).filter(Boolean);

        fd.append('name', (form.name || '').trim());
        fd.append('role', (form.role || '').trim());
        fd.append('domain', (form.domain || '').trim());
        fd.append('rollNumber', (form.rollNumber || '').trim());
        fd.append('email', (form.email || '').trim());
        fd.append('department', (form.department || '').trim());
        fd.append('description', (form.description || '').trim());
        fd.append('bio', (form.bio || '').trim());
        fd.append('skills', JSON.stringify(skillsArray));
        fd.append('status', form.status || 'Online');
        fd.append('color', form.color || '#71C4FF');
        fd.append('customRoleId', form.customRoleId || '');
        fd.append('telegram', (form.telegram || '').trim());
        fd.append('github', (form.github || '').trim());
        fd.append('linkedin', (form.linkedin || '').trim());
        fd.append('isSuspended', form.isSuspended ? 'true' : 'false');

        // RBAC: roles array (one entry per (domain, role) pair)
        const cleanedRoles = (form.roles || [])
            .filter(r => r && r.domain && r.role)
            .map(r => ({ domain: String(r.domain), role: String(r.role) }));
        fd.append('roles', JSON.stringify(cleanedRoles));

        // Photo handling
        if (photoFile && completedCrop && imgRef.current) {
            const blob = await croppedBlobFromImage(imgRef.current, completedCrop);
            if (blob) fd.append('photo', blob, 'avatar.png');
        } else if (removePhoto && isEdit) {
            // Empty string tells the backend to drop the photo
            fd.append('photo', '');
        }

        await onSubmit(fd);
    };

    // Keep hooks unconditional: derive `displayed` from `open` without early return.
    // Render nothing while closed, but hooks always run.
    const availableDomains = domainsList.length
        ? domainsList
        : [{ name: form.domain, adminRoles: DEFAULT_ROLE_OPTIONS }];

    const primaryRoleOptions = useMemo(
        () => roleOptionsForDomain(form.domain, availableDomains),
        [form.domain, availableDomains]
    );

    const currentPhotoSrc = removePhoto
        ? null
        : (photoPreview || (isEdit && form.photoUrl) || null);

    if (!open) return null;

    return (
        <div
            className="mem-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mem-modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <form className="mem-modal" onSubmit={handleSubmit}>
                {/* ── Header ──────────────────────────────────── */}
                <header className="mem-modal__header">
                    <div>
                        <h2 id="mem-modal-title">
                            {isEdit ? 'Edit Member' : 'Add New Member'}
                        </h2>
                        <p className="mem-modal__sub">
                            {isEdit
                                ? `Editing ${form.name} · /${form.id || form.rollNumber}`
                                : 'New member · slug is the roll number'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="mem-modal__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                {submitError && (
                    <div className="mem-modal__error" role="alert">
                        <AlertTriangle size={16} aria-hidden="true" /> {submitError}
                    </div>
                )}

                <div className="mem-modal__body">
                    {/* ── 1. Identity ──────────────────────────── */}
                    <fieldset className="mem-section">
                        <legend><User size={14} aria-hidden="true" /> Identity</legend>
                        <div className="mem-grid">
                            <Field
                                label="Full Name *"
                                icon={<User size={14} aria-hidden="true" />}
                                error={touched.name && errors.name}
                            >
                                <input
                                    required
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={form.name}
                                    onBlur={() => setTouched(t => ({ ...t, name: true }))}
                                    onChange={(e) => setField('name', e.target.value)}
                                />
                            </Field>

                            <Field
                                label="Roll Number *"
                                icon={<Hash size={14} aria-hidden="true" />}
                                error={touched.rollNumber && errors.rollNumber}
                                hint="Numeric KL roll number — also the URL slug"
                            >
                                <input
                                    required
                                    inputMode="numeric"
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={form.rollNumber}
                                    onBlur={() => setTouched(t => ({ ...t, rollNumber: true }))}
                                    onChange={(e) => setField('rollNumber', e.target.value.replace(/\D/g, ''))}
                                />
                            </Field>

                            <Field
                                label="KL Email"
                                icon={<Mail size={14} aria-hidden="true" />}
                                hint="Auto-generated from roll number"
                            >
                                <input
                                    type="email"
                                    value={form.email || ''}
                                    disabled
                                    readOnly
                                />
                            </Field>

                            <Field
                                label="Department"
                                icon={<Briefcase size={14} aria-hidden="true" />}
                            >
                                <input
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={form.department || ''}
                                    onChange={(e) => setField('department', e.target.value)}
                                    placeholder="CSE"
                                />
                            </Field>
                        </div>
                    </fieldset>

                    {/* ── 2. Role & Permissions ────────────────── */}
                    <fieldset className="mem-section">
                        <legend><Shield size={14} aria-hidden="true" /> Role &amp; Permissions</legend>

                        <div className="mem-grid">
                            <Field
                                label="Primary Domain *"
                                icon={<Tag size={14} aria-hidden="true" />}
                                error={touched.domain && errors.domain}
                            >
                                <select
                                    value={form.domain || ''}
                                    disabled={!canEditRoles}
                                    onBlur={() => setTouched(t => ({ ...t, domain: true }))}
                                    onChange={(e) => setField('domain', e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {availableDomains.map((d, index) => {
                                        const name = typeof d === 'string' ? d : (d?.name || `domain-${index}`);
                                        return (
                                            <option key={`${name}-${index}`} value={name} style={{ background: '#0a0a14', color: '#fff' }}>{name}</option>
                                        );
                                    })}
                                </select>
                            </Field>

                            <Field
                                label="Primary Role *"
                                error={!canEditRoles ? 'Only Zero Order / Advisor can change roles' : undefined}
                            >
                                <select
                                    value={form.role || ''}
                                    disabled={!canEditRoles}
                                    onChange={(e) => setField('role', e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {primaryRoleOptions.map(r => (
                                        <option key={r} value={r} style={{ background: '#0a0a14', color: '#fff' }}>{r}</option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label="Custom Security Role"
                                hint="Assign custom micro-permissions role created in Roles & Permissions"
                            >
                                <select
                                    value={form.customRoleId || ''}
                                    onChange={(e) => setField('customRoleId', e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="" style={{ background: '#0a0a14', color: '#fff' }}>None (Default Permissions)</option>
                                    {customRoleOptions.map(r => (
                                        <option key={r.id} value={r.id} style={{ background: '#0a0a14', color: '#fff' }}>
                                            {r.name} ({r.permissions?.length || 0} perms)
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        {/* Per-domain role matrix */}
                        <div className="mem-roles">
                            <div className="mem-roles__head">
                                <span>Additional Domain Roles</span>
                                <button
                                    type="button"
                                    className="mem-roles__add"
                                    onClick={addDomainRole}
                                    disabled={!canEditRoles}
                                >
                                    <Plus size={14} aria-hidden="true" /> Add a role
                                </button>
                            </div>
                            {(!form.roles || form.roles.length === 0) ? (
                                <p className="mem-roles__empty">
                                    No additional roles. Member will only appear under the primary domain.
                                </p>
                            ) : (
                                <ul className="mem-roles__list">
                                    {form.roles.map((r, i) => (
                                        <li key={i} className="mem-role">
                                            <select
                                                value={r.domain || ''}
                                                disabled={!canEditRoles}
                                                onChange={(e) => updateDomainRole(i, 'domain', e.target.value)}
                                                aria-label="Domain"
                                                style={{ colorScheme: 'dark' }}
                                            >
                                                <option value="" style={{ background: '#0a0a14', color: '#fff' }}>Choose a domain…</option>
                                                {availableDomains.map((d, index) => {
                                                    const name = typeof d === 'string' ? d : (d?.name || `domain-${index}`);
                                                    return (
                                                        <option key={`${name}-${index}`} value={name} style={{ background: '#0a0a14', color: '#fff' }}>{name}</option>
                                                    );
                                                })}
                                            </select>
                                            <select
                                                value={r.role || ''}
                                                disabled={!canEditRoles}
                                                onChange={(e) => updateDomainRole(i, 'role', e.target.value)}
                                                aria-label="Role in this domain"
                                                style={{ colorScheme: 'dark' }}
                                            >
                                                {roleOptionsForDomain(r.domain, availableDomains).map(opt => (
                                                    <option key={opt} value={opt} style={{ background: '#0a0a14', color: '#fff' }}>{opt}</option>
                                                ))}
                                            </select>
                                            {canEditRoles && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeDomainRole(i)}
                                                    className="mem-role__remove"
                                                    aria-label={`Remove role in ${r.domain}`}
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="mem-section__hint">
                                Adding a role in a domain lets this member manage that domain's members
                                and events in the admin dashboard.
                            </p>
                        </div>
                    </fieldset>

                    {/* ── 3. Profile ───────────────────────────── */}
                    <fieldset className="mem-section">
                        <legend><Palette size={14} aria-hidden="true" /> Profile</legend>
                        <div className="mem-grid">
                            <Field label="Color">
                                <input
                                    type="color"
                                    value={form.color || '#71C4FF'}
                                    onChange={(e) => setField('color', e.target.value)}
                                    className="mem-color"
                                    aria-label="Profile accent color"
                                />
                            </Field>

                            <Field label="Status">
                                <select
                                    value={form.status || 'Online'}
                                    onChange={(e) => setField('status', e.target.value)}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>

                            <Field label="Short Description" hint="One-liner shown on team cards">
                                <input
                                    value={form.description || ''}
                                    onChange={(e) => setField('description', e.target.value)}
                                    placeholder="Full-stack dev who loves GSAP"
                                />
                            </Field>

                            <Field label="Skills" hint="Comma-separated">
                                <input
                                    value={form.skills || ''}
                                    onChange={(e) => setField('skills', e.target.value)}
                                    placeholder="React, GSAP, MongoDB"
                                />
                            </Field>

                            <Field label="Bio" fullWidth>
                                <textarea
                                    rows={3}
                                    value={form.bio || ''}
                                    onChange={(e) => setField('bio', e.target.value)}
                                    placeholder="About this member…"
                                />
                            </Field>
                        </div>
                    </fieldset>

                    {/* ── 4. Contact ───────────────────────────── */}
                    <fieldset className="mem-section">
                        <legend><Send size={14} aria-hidden="true" /> Contact</legend>
                        <div className="mem-grid">
                            <Field
                                label="Telegram"
                                icon={<Send size={14} aria-hidden="true" />}
                                hint="Without the @"
                            >
                                <input
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={form.telegram || ''}
                                    onChange={(e) => setField('telegram', e.target.value)}
                                    placeholder="username"
                                />
                            </Field>

                            <Field
                                label="GitHub"
                                icon={<Github size={14} aria-hidden="true" />}
                            >
                                <input
                                    autoComplete="username"
                                    spellCheck={false}
                                    value={form.github || ''}
                                    onChange={(e) => setField('github', e.target.value)}
                                    placeholder="username"
                                />
                            </Field>

                            <Field
                                label="LinkedIn"
                                icon={<Linkedin size={14} aria-hidden="true" />}
                            >
                                <input
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={form.linkedin || ''}
                                    onChange={(e) => setField('linkedin', e.target.value)}
                                    placeholder="vanity-name"
                                />
                            </Field>
                        </div>
                    </fieldset>

                    {/* ── 5. Photo ─────────────────────────────── */}
                    <fieldset className="mem-section">
                        <legend><Camera size={14} aria-hidden="true" /> Photo</legend>

                        <div className="mem-photo">
                            <div className="mem-photo__preview">
                                {currentPhotoSrc ? (
                                    <img
                                        src={currentPhotoSrc}
                                        alt={form.name || 'Member avatar'}
                                        width={120}
                                        height={120}
                                    />
                                ) : (
                                    <div className="mem-photo__placeholder" aria-hidden="true">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>

                            <div className="mem-photo__controls">
                                <label className="mem-photo__upload">
                                    <Upload size={14} aria-hidden="true" />
                                    <span>
                                        {currentPhotoSrc ? 'Replace photo' : 'Upload photo'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handlePhotoChange}
                                        hidden
                                    />
                                </label>
                                {currentPhotoSrc && (
                                    <button
                                        type="button"
                                        className="mem-photo__remove"
                                        onClick={removeExistingPhoto}
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                        Remove
                                    </button>
                                )}
                                <p className="mem-photo__hint">
                                    JPEG / PNG / WebP · max 5 MB. Drag the crop box to reframe.
                                </p>
                            </div>
                        </div>

                        {photoPreview && (
                            <div className="mem-photo__crop">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    circularCrop
                                    keepSelection
                                    aspect={1}
                                >
                                    <img
                                        ref={imgRef}
                                        src={photoPreview}
                                        alt="Crop preview"
                                        onLoad={onImageLoad}
                                    />
                                </ReactCrop>
                            </div>
                        )}
                    </fieldset>

                    {/* ── 6. Danger Zone ──────────────────────── */}
                    {isEdit && canSuspend && (
                        <fieldset className="mem-section mem-section--danger">
                            <legend><AlertTriangle size={14} aria-hidden="true" /> Danger Zone</legend>
                            <label className="mem-danger">
                                <input
                                    type="checkbox"
                                    checked={!!form.isSuspended}
                                    onChange={(e) => setField('isSuspended', e.target.checked)}
                                />
                                <span>
                                    <strong>Suspend account</strong>
                                    <small>
                                        Suspended members cannot sign in until reactivated. They are hidden
                                        from public /team listings.
                                    </small>
                                </span>
                            </label>
                        </fieldset>
                    )}
                </div>

                {/* ── Footer ────────────────────────────────── */}
                <footer className="mem-modal__footer">
                    <button
                        type="button"
                        className="mem-btn mem-btn--ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="mem-btn mem-btn--primary"
                        disabled={saving}
                    >
                        <Save size={14} aria-hidden="true" />
                        {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add member')}
                    </button>
                </footer>
            </form>
        </div>
    );
}

// ── Small <Field> helper ─────────────────────────────────

function Field({ label, hint, error, icon, fullWidth, children }) {
    return (
        <label className={`mem-field${fullWidth ? ' mem-field--full' : ''}${error ? ' mem-field--error' : ''}`}>
            <span className="mem-field__label">
                {icon}
                {label}
            </span>
            {children}
            {error ? (
                <span className="mem-field__error" role="alert">{error}</span>
            ) : hint ? (
                <span className="mem-field__hint">{hint}</span>
            ) : null}
        </label>
    );
}
