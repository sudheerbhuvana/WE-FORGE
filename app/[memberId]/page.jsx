'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Mail, Send, Github, Linkedin, Hash, Briefcase, Building2,
    Shield, Crown, Star, Calendar, Layers, ExternalLink,
    AlertCircle, Loader2, Sparkles, FolderGit2,
    GraduationCap, School, Trophy, BadgeCheck,
} from 'lucide-react';
import BackButton from '../../src/components/BackButton';
import ProfileCard from '../../src/components/ProfileCard';
import { getAvatarUrl } from '../../src/services/memberService';
import '../../src/styles/profile.css';

// ── Constants ──────────────────────────────────────────────

const STATUS_COLOR = {
    Online: '#22c55e',
    Away: '#f59e0b',
    Busy: '#ef4444',
    Offline: '#6b7280',
};
const ELITE_DOMAINS = new Set(['Zero Order', 'Advisor']);
const HEAD_ROLES = new Set(['Chief', 'Lead', 'Co-Lead', 'Head']);
const PALETTE = ['#71C4FF', '#a855f7', '#f43f5e', '#f59e0b', '#10b981', '#ec4899', '#94a3b8'];

function pickAccent(domain) {
    const k = (domain || 'x').charCodeAt(0) + (domain || '').length;
    return PALETTE[k % PALETTE.length];
}

function formatDate(d) {
    if (!d) return '';
    try {
        return new Date(d).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch { return ''; }
}

// ── Page ──────────────────────────────────────────────────

const ProfilePage = () => {
    const { memberId } = useParams();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [registrations, setRegistrations] = useState([]);

    useEffect(() => {
        if (!memberId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await fetch(
                    `/api/members/by-slug/${encodeURIComponent(memberId)}`,
                    { credentials: 'include' }
                );
                if (cancelled) return;
                if (!res.ok) {
                    setError(res.status === 404 ? 'notfound' : 'load');
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                if (data?.error) {
                    setError('notfound');
                    setLoading(false);
                    return;
                }
                setMember(data);
                setLoading(false);

                if (data.email) {
                    fetch('/api/members/me/registrations', { credentials: 'include' })
                        .then(r => r.ok ? r.json() : [])
                        .then(list => {
                            if (cancelled) return;
                            setRegistrations(
                                Array.isArray(list)
                                    ? list.filter(reg => reg.email === data.email)
                                    : []
                            );
                        })
                        .catch(() => { });
                }
            } catch {
                if (!cancelled) { setError('load'); setLoading(false); }
            }
        })();

        return () => { cancelled = true; };
    }, [memberId]);

    const accent = useMemo(() => {
        if (!member) return '#71C4FF';
        return member.color?.startsWith('#') ? member.color : pickAccent(member.domain);
    }, [member]);

    const elite = useMemo(() => !!member && ELITE_DOMAINS.has(member.domain), [member]);
    const isSuspended = !!member?.isSuspended;

    // ── Loading ──────────────────────────────────────
    if (loading) {
        return (
            <div className="profile-page profile-page--loading">
                <Loader2 size={28} className="profile-page__spinner" aria-hidden="true" />
                <span>Loading profile…</span>
            </div>
        );
    }

    // ── Not found ────────────────────────────────────
    if (error || !member) {
        return (
            <div className="profile-page profile-page--error">
                <div className="profile-page__error-box">
                    <AlertCircle size={36} aria-hidden="true" />
                    <h2>Profile not found</h2>
                    <p>
                        We couldn’t find a member with the handle <code>/{memberId}</code>.
                        They may have graduated, been suspended, or the link might be wrong.
                    </p>
                    <div className="profile-page__error-actions">
                        <BackButton to="/team" />
                        <Link href="/team" className="profile-page__browse-btn">
                            Browse all members <ExternalLink size={14} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const displayRole = member.role || 'Member';
    const displayDomain = member.domain || 'General';
    const avatarUrl = getAvatarUrl(member);

    // Compose roles list (primary first, then multi-role array, deduped)
    const allRoles = [];
    const seen = new Set();
    const push = (r, primary) => {
        const key = `${r.domain}::${r.role}`;
        if (!key || seen.has(key)) return;
        seen.add(key);
        allRoles.push({ ...r, primary });
    };
    push({ domain: displayDomain, role: displayRole }, true);
    if (Array.isArray(member.roles)) member.roles.forEach(r => push(r, false));

    const hasContact = member.telegram || member.github || member.linkedin || member.email;

    return (
        <div className="profile-page" style={{ '--accent': accent }}>
            <BackButton to="/team" className="profile-page__back" />

            {isSuspended && (
                <div className="profile-page__suspended" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    This account is currently suspended. The profile is shown for archival purposes only.
                </div>
            )}

            <div className="profile-layout">
                {/* ════════════ LEFT RAIL — avatar + role + quick contact ════════════ */}
                <aside className="profile-rail">
                    <div className="profile-rail__avatar" aria-hidden="true" style={{ overflow: 'visible', background: 'transparent', border: 'none', maxWidth: '320px', aspectRatio: 'auto', margin: '0 0 16px 0' }}>
                        <style>{`
                            .member-profile-card {
                                width: 100%;
                                height: 100%;
                            }
                            .member-profile-card .pc-card {
                                height: auto !important;
                                width: 100% !important;
                                max-height: none !important;
                                aspect-ratio: 0.75 !important;
                                border-radius: 20px !important;
                            }
                        `}</style>
                        <ProfileCard
                            name={member.name}
                            title={displayRole}
                            handle={member.rollNumber || member.id}
                            status={member.status || 'Online'}
                            contactText="Contact"
                            avatarUrl={avatarUrl}
                            showUserInfo={true}
                            enableTilt={true}
                            onContactClick={() => {
                                if (member.telegram) {
                                    window.open(`https://t.me/${member.telegram.replace('@', '')}`, '_blank', 'noopener,noreferrer');
                                } else if (member.email) {
                                    window.open(`mailto:${member.email}`);
                                }
                            }}
                            behindGlowEnabled={false}
                            innerGradient={`linear-gradient(145deg, ${accent}8c 0%, ${accent}44 100%)`}
                            className="member-profile-card"
                        />
                    </div>

                    {/* Identity header — name + tagline only. Role/status pills dropped. */}
                    <div className="profile-rail__header">
                        <h1 className="profile-rail__name">{member.name}</h1>
                        {member.description && (
                            <p className="profile-rail__tagline">{member.description}</p>
                        )}
                    </div>

                    {/* Roles — small inline list, sits below the name in the rail */}
                    {allRoles.length > 0 && (
                        <section className="profile-rail__roles" aria-label="Roles">
                            <h3 className="profile-rail__roles-title">Roles</h3>
                            <ul className="profile-roles profile-roles--rail">
                                {allRoles.map((r, i) => {
                                    const accentRow = pickAccent(r.domain);
                                    return (
                                        <li
                                            key={`${r.domain}-${r.role}-${i}`}
                                            className="profile-roles__item profile-roles__item--rail"
                                        >
                                            <DomainBadge
                                                domain={r.domain}
                                                accent={accentRow}
                                                small
                                            />
                                            <span className="profile-roles__name">{r.role}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {/* Contact — compact list under Roles in the rail */}
                    {hasContact && (
                        <section className="profile-rail__contact" aria-label="Contact">
                            <h3 className="profile-rail__roles-title">Contact</h3>
                            <ul className="profile-contact profile-contact--rail">
                                {member.telegram && (
                                    <li>
                                        <a className="profile-contact__chip"
                                            href={`https://t.me/${member.telegram}`}
                                            target="_blank" rel="noopener noreferrer"
                                            aria-label={`Telegram @${member.telegram}`}>
                                            <Send size={13} aria-hidden="true" />
                                            <span className="profile-contact__handle">@{member.telegram}</span>
                                        </a>
                                    </li>
                                )}
                                {member.github && (
                                    <li>
                                        <a className="profile-contact__chip"
                                            href={`https://github.com/${member.github}`}
                                            target="_blank" rel="noopener noreferrer"
                                            aria-label={`GitHub ${member.github}`}>
                                            <Github size={13} aria-hidden="true" />
                                            <span className="profile-contact__handle">@{member.github}</span>
                                        </a>
                                    </li>
                                )}
                                {member.linkedin && (
                                    <li>
                                        <a className="profile-contact__chip"
                                            href={`https://linkedin.com/in/${member.linkedin}`}
                                            target="_blank" rel="noopener noreferrer"
                                            aria-label={`LinkedIn ${member.linkedin}`}>
                                            <Linkedin size={13} aria-hidden="true" />
                                            <span className="profile-contact__handle">in/{member.linkedin}</span>
                                        </a>
                                    </li>
                                )}
                                {member.email && (
                                    <li>
                                        <a className="profile-contact__chip"
                                            href={`mailto:${member.email}`}
                                            aria-label={`Email ${member.email}`}>
                                            <Mail size={13} aria-hidden="true" />
                                            <span className="profile-contact__handle">{member.email}</span>
                                        </a>
                                    </li>
                                )}
                            </ul>
                        </section>
                    )}
                </aside>

                {/* ════════════ RIGHT COLUMN — sections ════════════ */}
                <main className="profile-main">
                    {/* Identity card moved here */}
                    <section className="profile-card">
                        <h2 className="profile-card__title">
                            <Hash size={15} aria-hidden="true" /> Identity
                        </h2>
                        <dl className="profile-rail__id">
                            <RailRow icon={<Hash size={13} aria-hidden="true" />} label="Roll Number">
                                <span className="mono">{member.rollNumber || member.id}</span>
                            </RailRow>
                            <RailRow icon={<Mail size={13} aria-hidden="true" />} label="KL Email">
                                {member.email ? (
                                    <a href={`mailto:${member.email}`} className="profile-rail__link">
                                        {member.email}
                                    </a>
                                ) : <span className="muted">Not set</span>}
                            </RailRow>
                            <RailRow icon={<Briefcase size={13} aria-hidden="true" />} label="Department">
                                {member.department || <span className="muted">—</span>}
                            </RailRow>
                            <RailRow icon={<Building2 size={13} aria-hidden="true" />} label="Primary Domain">
                                <DomainBadge domain={displayDomain} accent={accent} small />
                            </RailRow>
                            {Array.isArray(member.cgpas) && member.cgpas.length > 0 && (
                                <div className="profile-rail__row profile-rail__row--wide">
                                    <span className="profile-rail__row-label">
                                        <GraduationCap size={13} aria-hidden="true" /> CGPA
                                    </span>
                                    <span className="profile-academic-chips">
                                        {member.cgpas.map((c) => (
                                            <span key={c._id} className="profile-academic-chip profile-academic-chip--readonly">
                                                <strong>{c.value}</strong>
                                                <span className="profile-academic-chip__scale">/{c.scale || 10}</span>
                                                {c.label && <span className="profile-academic-chip__label">{c.label}</span>}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            )}
                            {Array.isArray(member.schools) && member.schools.length > 0 && (
                                <div className="profile-rail__row profile-rail__row--wide">
                                    <span className="profile-rail__row-label">
                                        <School size={13} aria-hidden="true" /> School
                                    </span>
                                    <span className="profile-academic-list profile-academic-list--readonly">
                                        {member.schools.map((s) => (
                                            <span key={s._id} className="profile-academic-row profile-academic-row--readonly">
                                                <strong>{s.name}</strong>
                                                {(s.level || s.boardOrUni || s.year) && (
                                                    <span className="profile-academic-row__meta">
                                                        {s.level && <span>{s.level}</span>}
                                                        {s.level && s.boardOrUni && <span className="dot">·</span>}
                                                        {s.boardOrUni && <span>{s.boardOrUni}</span>}
                                                        {(s.level || s.boardOrUni) && s.year && <span className="dot">·</span>}
                                                        {s.year && <span>{s.year}</span>}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </dl>
                    </section>

                    {member.bio && (
                        <section className="profile-card">
                            <h2 className="profile-card__title">
                                <Sparkles size={15} aria-hidden="true" /> About
                            </h2>
                            <p className="profile-card__bio">{member.bio}</p>
                        </section>
                    )}

                    {Array.isArray(member.skills) && member.skills.length > 0 && (
                        <section className="profile-card">
                            <h2 className="profile-card__title">
                                <Star size={15} aria-hidden="true" /> Skills
                            </h2>
                            <ul className="profile-skillpills">
                                {member.skills.map(skill => (
                                    <li key={skill} className="profile-skillpill">{skill}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <ProjectsReadOnly
                        projects={Array.isArray(member.projects) ? member.projects : []}
                    />

                    <AchievementsReadOnly
                        achievements={Array.isArray(member.achievements) ? member.achievements : []}
                    />

                    <CertificationsReadOnly
                        certifications={Array.isArray(member.certifications) ? member.certifications : []}
                    />

                    <section className="profile-card">
                        <h2 className="profile-card__title">
                            <Calendar size={15} aria-hidden="true" /> Activity
                        </h2>
                        {registrations.length === 0 ? (
                            <p className="profile-card__empty">
                                No public registrations yet. Once this member signs up for events, they’ll show up here.
                            </p>
                        ) : (
                            <ul className="profile-activity">
                                {registrations.slice(0, 8).map(reg => (
                                    <li key={reg.id || `${reg.eventId}-${reg.email}`}
                                        className="profile-activity__item">
                                        <div>
                                            <strong>{reg.eventTitle || reg.eventId}</strong>
                                            {reg.eventDate && (
                                                <span className="profile-activity__date">
                                                    {' · '}{formatDate(reg.eventDate)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="profile-activity__role">{reg.role}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
};

// ── Tiny row used inside the rail ──────────────────────
function RailRow({ icon, label, children }) {
    return (
        <div className="profile-rail__row">
            <span className="profile-rail__row-label">{icon}{label}</span>
            <span className="profile-rail__row-value">{children}</span>
        </div>
    );
}

function DomainBadge({ domain, accent = '#71C4FF', small = false }) {
    return (
        <span
            className={`profile-domain${small ? ' profile-domain--small' : ''}`}
            style={{
                color: accent,
                borderColor: `${accent}55`,
                backgroundColor: `${accent}11`,
            }}
        >
            <span
                className="profile-domain__dot"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
            />
            {domain}
        </span>
    );
}

// ── Read-only project cards on the public profile page ──────
function ProjectsReadOnly({ projects }) {
    const list = Array.isArray(projects) ? projects : [];
    return (
        <section className="profile-card">
            <h2 className="profile-card__title">
                <FolderGit2 size={15} aria-hidden="true" /> Projects
            </h2>
            {list.length === 0 ? (
                <p className="profile-card__empty">
                    No projects added yet.
                </p>
            ) : (
                <ul className="profile-projects">
                    {list.map((p) => (
                        <li key={p._id} className="profile-project">
                            {p.imageUrl ? (
                                <div className="profile-project__cover">
                                    <img src={p.imageUrl} alt="" loading="lazy" />
                                </div>
                            ) : (
                                <div className="profile-project__cover profile-project__cover--placeholder" aria-hidden="true">
                                    <FolderGit2 size={22} />
                                </div>
                            )}
                            <div className="profile-project__body">
                                <h3 className="profile-project__title">
                                    {p.link ? (
                                        <a href={p.link} target="_blank" rel="noopener noreferrer">
                                            {p.title}
                                            <ExternalLink size={11} aria-hidden="true" />
                                        </a>
                                    ) : (
                                        p.title
                                    )}
                                </h3>
                                {p.description && (
                                    <p className="profile-project__desc">{p.description}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default ProfilePage;

// ── Read-only achievements list on the public profile page ─
function AchievementsReadOnly({ achievements }) {
    if (!achievements || achievements.length === 0) return null;
    return (
        <section className="profile-card">
            <h2 className="profile-card__title">
                <Trophy size={15} aria-hidden="true" /> Achievements
            </h2>
            <ul className="profile-resume-list">
                {achievements.map((a) => (
                    <li key={a._id} className="profile-resume-item">
                        <div className="profile-resume-icon" aria-hidden="true">
                            <Trophy size={16} />
                        </div>
                        <div className="profile-resume-body">
                            <h3 className="profile-resume-title profile-resume-title--public">
                                {a.link ? (
                                    <a href={a.link} target="_blank" rel="noopener noreferrer">
                                        {a.title} <ExternalLink size={11} aria-hidden="true" />
                                    </a>
                                ) : (
                                    a.title
                                )}
                            </h3>
                            {(a.issuer || a.date) && (
                                <p className="profile-resume-meta">
                                    {a.issuer && <span>{a.issuer}</span>}
                                    {a.issuer && a.date && <span className="dot">·</span>}
                                    {a.date && <span>{a.date}</span>}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ── Read-only certifications list on the public profile page ─
function CertificationsReadOnly({ certifications }) {
    if (!certifications || certifications.length === 0) return null;
    return (
        <section className="profile-card">
            <h2 className="profile-card__title">
                <BadgeCheck size={15} aria-hidden="true" /> Certifications
            </h2>
            <ul className="profile-resume-list">
                {certifications.map((c) => (
                    <li key={c._id} className="profile-resume-item">
                        <div className="profile-resume-icon" aria-hidden="true">
                            <BadgeCheck size={16} />
                        </div>
                        <div className="profile-resume-body">
                            <h3 className="profile-resume-title profile-resume-title--public">
                                {c.credentialUrl ? (
                                    <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer">
                                        {c.name} <ExternalLink size={11} aria-hidden="true" />
                                    </a>
                                ) : (
                                    c.name
                                )}
                            </h3>
                            {(c.issuer || c.issued) && (
                                <p className="profile-resume-meta">
                                    {c.issuer && <span>{c.issuer}</span>}
                                    {c.issuer && c.issued && <span className="dot">·</span>}
                                    {c.issued && <span>{c.issued}</span>}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
