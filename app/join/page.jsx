'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, ShieldCheck, CheckCircle2, Clock, XCircle, Plus, Trash2, 
  ExternalLink, Layers, ArrowRight, Lock, UserCheck, AlertCircle, FileText, Send
} from 'lucide-react';
import BackButton from '../../src/components/BackButton';
import Footer from '../../src/components/Footer';
import './page.css';

const RECRUITMENT_DOMAINS = [
  { id: 'Technical', title: 'Technical', desc: 'Software development, systems, web apps, AI/ML, and technical architecture.' },
  { id: 'Media & Broadcasting', title: 'Media & Broadcasting', desc: 'Videography, photography, reels, event coverage, and visual storytelling.' },
  { id: 'Operations & Protocol', title: 'Operations & Protocol', desc: 'Event planning, logistics, ops coordination, and community management.' },
  { id: 'Creative & Content', title: 'Creative & Content', desc: 'Graphic design, UI/UX, branding, illustrations, and creative direction.' },
  { id: 'Public Speaking', title: 'Public Speaking', desc: 'Event anchoring, workshops, presentations, and stage presence.' },
  { id: 'Advisors', title: 'Advisors', desc: 'Strategic guidance, mentoring, and advisory roles across club activities.' },
];

export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({ isOpen: true, title: 'KLFORGE Recruitment Drive', subtitle: 'Shape the future of technology, design, media, and leadership.', description: '', heroImageUrl: '' });
  const domains = RECRUITMENT_DOMAINS; // Fixed — never pulled from /api/domains
  const [actorInfo, setActorInfo] = useState({ rollNumber: '', year: 'Y24', email: '', name: '' });
  const [existingApp, setExistingApp] = useState(null);

  // Form State
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [secondaryDomain, setSecondaryDomain] = useState('');
  const [whyDomain, setWhyDomain] = useState('');
  const [whySecondaryDomain, setWhySecondaryDomain] = useState('');
  const [workLinks, setWorkLinks] = useState([{ title: 'Portfolio / GitHub', url: '' }]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadInitData();
  }, [status]);

  const loadInitData = async () => {
    setLoading(true);
    try {
      // Fetch config & application state if authenticated
      if (status === 'authenticated') {
        const appRes = await fetch('/api/recruitments/apply');
        if (appRes.ok) {
          const data = await appRes.json();
          if (data.settings) setSettings(data.settings);
          if (data.actor) setActorInfo(data.actor);
          if (data.application) {
            setExistingApp(data.application);
            setPrimaryDomain(data.application.primaryDomain || '');
            setSecondaryDomain(data.application.secondaryDomain || '');
            setWhyDomain(data.application.whyDomain || '');
            setWhySecondaryDomain(data.application.whySecondaryDomain || '');
            if (Array.isArray(data.application.workLinks) && data.application.workLinks.length > 0) {
              setWorkLinks(data.application.workLinks);
            }
          }
        }
      } else {
        const cfgRes = await fetch('/api/recruitments/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setSettings(cfg);
        }
      }
    } catch (err) {
      console.error('Failed to load recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (workLinks.length >= 5) return;
    setWorkLinks([...workLinks, { title: '', url: '' }]);
  };

  const handleRemoveLink = (index) => {
    setWorkLinks(workLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index, field, val) => {
    const next = [...workLinks];
    next[index][field] = val;
    setWorkLinks(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!primaryDomain) {
      setError('Please select a primary domain.');
      return;
    }
    if (!whyDomain.trim() || whyDomain.trim().length < 10) {
      setError('Please explain why you chose your primary domain (min 10 characters).');
      return;
    }
    if (secondaryDomain && (!whySecondaryDomain.trim() || whySecondaryDomain.trim().length < 10)) {
      setError('Please explain why you chose your secondary domain (min 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/recruitments/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryDomain,
          secondaryDomain,
          whyDomain,
          whySecondaryDomain,
          workLinks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setExistingApp(data.application);
      setSuccessMsg('Your application has been submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="join-page">
        <div className="join-page__loading">
          <div className="join-page__spinner" />
          <p>Loading recruitment workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <main className="join-main">
        {/* Hero Section */}
        <section className="join-hero">
          <div className="join-hero__glow" />
          <div className="join-hero__content">
            <h1 className="join-hero__title">{settings.title || 'Join KLFORGE'}</h1>
            <p className="join-hero__subtitle">{settings.subtitle || 'Shape the future of technology, design, media, and leadership.'}</p>
            {settings.description && (
              <p className="join-hero__desc">{settings.description}</p>
            )}

            {settings.heroImageUrl && (
              <div className="join-hero__banner-wrap">
                <img src={settings.heroImageUrl} alt="Recruitment Banner" className="join-hero__banner-img" />
              </div>
            )}
          </div>
        </section>

        {/* Main Content Area */}
        <div className="join-container">
          {/* Unauthenticated View */}
          {status !== 'authenticated' && (
            <div className="join-card join-card--auth">
              <div className="join-card__icon-badge">
                <Lock size={28} />
              </div>
              <h2>Authentication Required</h2>
              <p>You must log in with your official KL University Microsoft account (e.g. <code>2400080210@kluniversity.in</code>) to apply for recruitments.</p>
              <button className="join-btn join-btn--primary" onClick={() => signIn('azure-ad', { callbackUrl: '/join' })}>
                <UserCheck size={18} /> Sign In with Microsoft
              </button>
            </div>
          )}

          {/* Closed Recruitment View */}
          {status === 'authenticated' && !settings.isOpen && (
            <div className="join-card join-card--closed" style={{ padding: '44px 32px' }}>
              <div className="join-card__icon-badge join-card__icon-badge--closed">
                <Clock size={32} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0 4px' }}>Recruitments Closed</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', maxWidth: '460px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                Recruitments are currently closed for this phase. Follow our official announcements and notices for updates on upcoming recruitment drives!
              </p>

              {/* Available Domains Preview */}
              <div style={{ marginTop: 12, marginBottom: 20 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DOMAINS AT KLFORGE</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                  {domains.map((dom) => (
                    <span key={dom.id} style={{ background: 'rgba(113, 196, 255, 0.08)', border: '1px solid rgba(113, 196, 255, 0.2)', color: '#71C4FF', padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600 }}>
                      {dom.title}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="join-btn join-btn--secondary" onClick={() => router.push('/projects')}>
                  Explore Club Projects <ArrowRight size={14} />
                </button>
                <button type="button" className="join-btn join-btn--primary" onClick={() => router.push('/notices')}>
                  Check Notices
                </button>
              </div>

              {existingApp && (
                <div className="join-app-status" style={{ marginTop: 24, width: '100%', maxWidth: 440, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', padding: 20, borderRadius: 16 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px', color: '#fff' }}>Your Submission</h3>
                  <div className="join-app-status__badge-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                    <span className="join-app-status__meta" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Submitted: {new Date(existingApp.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="join-app-status__details" style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)' }}>
                    <p><strong>Primary Domain:</strong> {existingApp.primaryDomain}</p>
                    {existingApp.secondaryDomain && <p><strong>Secondary Domain:</strong> {existingApp.secondaryDomain}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Active Application Form */}
        {status === 'authenticated' && settings.isOpen && (
          <div className="join-content-grid">

            {/* Applicant Profile Card */}
            <div className="join-profile-bar">
              <div className="join-profile-bar__user">
                <div className="join-profile-bar__avatar">
                  {session?.user?.name?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="join-profile-bar__name">{session?.user?.name || actorInfo.name}</h3>
                  <p className="join-profile-bar__email">{session?.user?.email || actorInfo.email}</p>
                </div>
              </div>
              <div className="join-profile-bar__meta">
                <div className="join-meta-pill">
                  <span className="join-meta-pill__label">ID</span>
                  <span className="join-meta-pill__val">{actorInfo.rollNumber || 'Student'}</span>
                </div>
                <div className="join-meta-pill join-meta-pill--year">
                  <span className="join-meta-pill__label">YEAR</span>
                  <span className="join-meta-pill__val">{actorInfo.year}</span>
                </div>
              </div>
            </div>

            {/* Submitted Application View */}
            {existingApp ? (
              <div className="join-card join-card--existing" style={{ padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(92, 219, 149, 0.15)', border: '1px solid rgba(92, 219, 149, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5cdb95' }}>
                    <CheckCircle2 size={36} />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Application Submitted!</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto 24px' }}>
                  Your recruitment application for <strong>KLFORGE</strong> was received on {new Date(existingApp.submittedAt).toLocaleDateString()}.
                </p>

                <div className="join-meta-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Primary Domain</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#71C4FF', marginTop: 4 }}>{existingApp.primaryDomain}</div>
                  </div>
                  {existingApp.secondaryDomain && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Secondary Domain</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{existingApp.secondaryDomain}</div>
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Applicant ID</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{actorInfo.rollNumber || 'Student'} ({actorInfo.year})</div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="join-form">

              {/* Domain Selection */}
              <div className="join-form-section">
                <div className="join-section-header">
                  <h2>1. Select Primary Domain <span className="join-req">*</span></h2>
                  <p>Choose the core domain you want to contribute to in KLFORGE.</p>
                </div>

                <div className="join-domains-grid">
                  {domains.map((dom) => {
                    const isSelected = primaryDomain === dom.title;
                    const isSecSelected = secondaryDomain === dom.title;
                    return (
                      <div
                        key={dom.id}
                        className={`join-domain-card ${isSelected ? 'join-domain-card--selected' : ''} ${isSecSelected ? 'join-domain-card--secondary' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setPrimaryDomain('');
                          } else {
                            if (secondaryDomain === dom.title) setSecondaryDomain('');
                            setPrimaryDomain(dom.title);
                          }
                        }}
                      >
                        <div className="join-domain-card__header">
                          <h3>{dom.title}</h3>
                          {isSelected && <span className="join-tag join-tag--primary">PRIMARY</span>}
                          {isSecSelected && <span className="join-tag join-tag--secondary">SECONDARY</span>}
                        </div>
                        <p>{dom.desc}</p>
                        <button
                          type="button"
                          className="join-domain-card__select-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryDomain(dom.title);
                          }}
                        >
                          {isSelected ? '✓ Selected as Primary' : 'Select Primary'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Domain (Optional) */}
              <div className="join-form-section">
                <div className="join-section-header">
                  <h2>2. Secondary Domain <span className="join-opt">(Optional)</span></h2>
                  <p>Optionally pick an alternate domain if you have multi-disciplinary interests.</p>
                </div>
                <select
                  value={secondaryDomain}
                  onChange={(e) => setSecondaryDomain(e.target.value)}
                  className="join-input join-input--select"
                >
                  <option value="">-- None (Only Primary) --</option>
                  {domains.filter(d => d.title !== primaryDomain).map(d => (
                    <option key={d.id} value={d.title}>{d.title}</option>
                  ))}
                </select>
              </div>

              {/* Why Primary Domain */}
              <div className="join-form-section">
                <div className="join-section-header">
                  <h2>3. Why did you choose your primary domain? <span className="join-req">*</span></h2>
                  <p>Tell us about your interest, previous experience, or what you hope to build/accomplish in <strong>{primaryDomain || 'this domain'}</strong>.</p>
                </div>
                <textarea
                  className="join-textarea"
                  rows={5}
                  value={whyDomain}
                  onChange={(e) => setWhyDomain(e.target.value)}
                  placeholder={`Share your story, skills, and why you are excited to join ${primaryDomain || 'this domain'}...`}
                  required
                />
              </div>

              {/* Why Secondary Domain — only shows when one is selected */}
              {secondaryDomain && (
                <div className="join-form-section">
                  <div className="join-section-header">
                    <h2>3b. Why did you choose your secondary domain? <span className="join-req">*</span></h2>
                    <p>Explain your interest and relevant skills in <strong>{secondaryDomain}</strong>.</p>
                  </div>
                  <textarea
                    className="join-textarea"
                    rows={4}
                    value={whySecondaryDomain}
                    onChange={(e) => setWhySecondaryDomain(e.target.value)}
                    placeholder={`Why do you want to contribute to ${secondaryDomain}? What skills do you bring?`}
                    required
                  />
                </div>
              )}

              {/* Work Links */}
              <div className="join-form-section">
                <div className="join-section-header">
                  <h2>4. Work Links & Portfolio <span className="join-opt">(Optional)</span></h2>
                  <p>Add links to your GitHub, Figma, Behance, Google Drive, Portfolio, or past projects.</p>
                </div>

                <div className="join-links-list">
                  {workLinks.map((link, idx) => (
                    <div key={idx} className="join-link-row">
                      <input
                        type="text"
                        className="join-input join-input--title"
                        placeholder="Link Title (e.g. GitHub / Figma)"
                        value={link.title}
                        onChange={(e) => handleLinkChange(idx, 'title', e.target.value)}
                      />
                      <input
                        type="url"
                        className="join-input join-input--url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                      />
                      {workLinks.length > 1 && (
                        <button
                          type="button"
                          className="join-link-remove"
                          onClick={() => handleRemoveLink(idx)}
                          title="Remove Link"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {workLinks.length < 5 && (
                  <button
                    type="button"
                    className="join-btn join-btn--ghost"
                    onClick={handleAddLink}
                  >
                    <Plus size={16} /> Add Another Work Link
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <div className="join-form-actions">
                <button
                  type="submit"
                  className="join-btn join-btn--submit"
                  disabled={submitting || !primaryDomain || !whyDomain.trim() || (!!secondaryDomain && !whySecondaryDomain.trim())}
                >
                  {submitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>{existingApp ? 'Update Application' : 'Submit Application'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
