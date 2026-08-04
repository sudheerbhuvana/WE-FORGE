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

const DEFAULT_DOMAINS = [
  { id: 'Tech & Innovation', title: 'Tech & Innovation', desc: 'Software, systems, web apps, AI/ML, and technical architecture.', icon: 'Code' },
  { id: 'Media & Content', title: 'Media & Content', desc: 'Visual media, videography, photography, design, and branding.', icon: 'Camera' },
  { id: 'Content & Creation', title: 'Content & Creation', desc: 'Creative writing, technical documentation, blogs, and copy.', icon: 'Edit3' },
  { id: 'Operations', title: 'Operations', desc: 'Event planning, logistics, coordination, and community management.', icon: 'FolderKanban' },
  { id: 'Speaking', title: 'Speaking', desc: 'Public speaking, event anchoring, workshops, and presentations.', icon: 'Mic' }
];

export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({ isOpen: true, title: 'KLFORGE Recruitment Drive', subtitle: 'Shape the future of technology, design, media, and leadership.', description: '', heroImageUrl: '' });
  const [domains, setDomains] = useState(DEFAULT_DOMAINS);
  const [actorInfo, setActorInfo] = useState({ rollNumber: '', year: 'Y24', email: '', name: '' });
  const [existingApp, setExistingApp] = useState(null);

  // Form State
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [secondaryDomain, setSecondaryDomain] = useState('');
  const [whyDomain, setWhyDomain] = useState('');
  const [workLinks, setWorkLinks] = useState([{ title: 'Portfolio / GitHub', url: '' }]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadInitData();
  }, [status]);

  const loadInitData = async () => {
    setLoading(true);
    try {
      // 1. Fetch domains
      const domRes = await fetch('/api/domains');
      if (domRes.ok) {
        const dData = await domRes.json();
        if (Array.isArray(dData) && dData.length > 0) {
          setDomains(dData.map(d => ({
            id: d.name,
            title: d.name,
            desc: d.description || 'Contribute and excel in this domain.',
            color: d.color || '#71C4FF'
          })));
        }
      }

      // 2. Fetch config & application state if authenticated
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
      setError('Please explain why you chose this domain (min 10 characters).');
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
      <BackButton href="/" label="Back to Home" />

      {/* Hero Section */}
      <section className="join-hero">
        <div className="join-hero__glow" />
        <div className="join-hero__content">
          <div className="join-hero__badge">
            <Sparkles size={14} className="join-hero__badge-icon" />
            <span>KLFORGE RECRUITMENTS</span>
          </div>
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
      <main className="join-container">
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
          <div className="join-card join-card--closed">
            <div className="join-card__icon-badge join-card__icon-badge--closed">
              <Clock size={32} />
            </div>
            <h2>Recruitments Closed</h2>
            <p>Recruitments are currently closed. Follow our official announcements and notices for updates on upcoming recruitment drives!</p>
            
            {existingApp && (
              <div className="join-app-status">
                <h3>Your Last Application</h3>
                <div className="join-app-status__badge-row">
                  <span className={`join-status-pill join-status-pill--${existingApp.status}`}>
                    {existingApp.status.toUpperCase()}
                  </span>
                  <span className="join-app-status__meta">Submitted: {new Date(existingApp.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="join-app-status__details">
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

            {/* Existing Submission Status Alert */}
            {existingApp && (
              <div className="join-card join-card--existing">
                <div className="join-existing-header">
                  <div>
                    <h4>Application Status</h4>
                    <p>Submitted on {new Date(existingApp.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`join-status-pill join-status-pill--${existingApp.status}`}>
                    {existingApp.status === 'pending' ? 'UNDER REVIEW' : existingApp.status.toUpperCase()}
                  </span>
                </div>
                <p className="join-existing-note">
                  You have already submitted an application. You can update your domain preferences or motivation text below while recruitments remain open.
                </p>
              </div>
            )}

            {/* Feedback Messages */}
            {error && (
              <div className="join-alert join-alert--error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="join-alert join-alert--success">
                <CheckCircle2 size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Application Form */}
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

              {/* Motivation */}
              <div className="join-form-section">
                <div className="join-section-header">
                  <h2>3. Why did you choose this domain? <span className="join-req">*</span></h2>
                  <p>Tell us about your interest, previous experience, or what you hope to build/accomplish with us.</p>
                </div>
                <textarea
                  className="join-textarea"
                  rows={5}
                  value={whyDomain}
                  onChange={(e) => setWhyDomain(e.target.value)}
                  placeholder="Share your story, skills, and why you are excited to join this domain..."
                  required
                />
              </div>

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
                  disabled={submitting || !primaryDomain || !whyDomain.trim()}
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
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
