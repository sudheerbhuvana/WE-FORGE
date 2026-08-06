'use client';

import React, { useState } from 'react';
import { Download, Search, ExternalLink, Eye, X, Trash2 } from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

export default function RecruitmentsSection({
  recruitmentSettings: initialSettings,
  recruitmentApps,
  refreshData
}) {
  const [recruitmentSettings, setRecruitmentSettings] = useState(initialSettings || { isOpen: true, title: '', subtitle: '', description: '', heroImageUrl: '' });
  const [recruitmentSettingsSaving, setRecruitmentSettingsSaving] = useState(false);
  const [recruitmentFilterDomain, setRecruitmentFilterDomain] = useState('all');
  const [recruitmentFilterYear, setRecruitmentFilterYear] = useState('all');
  const [recruitmentFilterStatus, setRecruitmentFilterStatus] = useState('all');
  const [recruitmentSearch, setRecruitmentSearch] = useState('');
  const [viewingRecApp, setViewingRecApp] = useState(null);
  const [recAppNotesInput, setRecAppNotesInput] = useState('');
  const [appDeleteConfirm, setAppDeleteConfirm] = useState(null);

  const deleteApp = async (id, name) => {
    if (!confirm(`Delete recruitment application from "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/recruitments/applications?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete application');
      setAppDeleteConfirm(null);
      if (viewingRecApp && viewingRecApp._id === id) setViewingRecApp(null);
      if (refreshData) refreshData();
    } catch (err) { alert(err.message); }
  };

  const saveRecruitmentSettings = async () => {
    setRecruitmentSettingsSaving(true);
    try {
      await fetch('/api/recruitments/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recruitmentSettings),
      });
      if (refreshData) refreshData();
    } catch {} finally {
      setRecruitmentSettingsSaving(false);
    }
  };

  const updateAppStatus = async (id, status, notes) => {
    const res = await fetch('/api/recruitments/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminNotes: notes }),
    });
    if (res.ok && refreshData) refreshData();
  };

  const exportRecruitmentsCSV = () => {
    const headers = ['Name', 'Email', 'Roll Number', 'Year', 'Primary Domain', 'Secondary Domain', 'Status', 'Submitted At', 'Why Domain', 'Work Links'];
    const rows = recruitmentApps.map(app => [
      `"${app.name || ''}"`,
      `"${app.email || ''}"`,
      `"${app.rollNumber || ''}"`,
      `"${app.year || ''}"`,
      `"${app.primaryDomain || ''}"`,
      `"${app.secondaryDomain || ''}"`,
      `"${app.status || ''}"`,
      `"${new Date(app.submittedAt).toLocaleDateString()}"`,
      `"${(app.whyDomain || '').replace(/"/g, '""')}"`,
      `"${(app.workLinks || []).map(l => l.url).join(' | ')}"`
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'forge_recruitment_applications.csv');
    link.click();
  };

  let filtered = recruitmentApps.slice();
  if (recruitmentFilterDomain !== 'all') {
    filtered = filtered.filter(a => a.primaryDomain === recruitmentFilterDomain || a.secondaryDomain === recruitmentFilterDomain);
  }
  if (recruitmentFilterYear !== 'all') {
    filtered = filtered.filter(a => a.year === recruitmentFilterYear);
  }
  if (recruitmentFilterStatus !== 'all') {
    filtered = filtered.filter(a => a.status === recruitmentFilterStatus);
  }
  if (recruitmentSearch.trim()) {
    const q = recruitmentSearch.trim().toLowerCase();
    filtered = filtered.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.rollNumber || '').toLowerCase().includes(q) ||
      (a.primaryDomain || '').toLowerCase().includes(q) ||
      (a.whyDomain || '').toLowerCase().includes(q)
    );
  }

  const counts = {
    total: recruitmentApps.length,
    pending: recruitmentApps.filter(a => a.status === 'pending').length,
    shortlisted: recruitmentApps.filter(a => a.status === 'shortlisted').length,
    accepted: recruitmentApps.filter(a => a.status === 'accepted').length,
    rejected: recruitmentApps.filter(a => a.status === 'rejected').length,
  };

  const uniqueYears = Array.from(new Set(recruitmentApps.map(a => a.year).filter(Boolean))).sort();
  const uniqueDomains = Array.from(new Set(recruitmentApps.map(a => a.primaryDomain).filter(Boolean))).sort();

  return (
    <div className="admin-section">
      {/* Header & Settings Box */}
      <div className="admin-dash__title-row">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Recruitments Management</h2>
          <p className="admin-section__subtitle">Manage drive status, hero image, and applicant submissions.</p>
        </div>
        <button className="admin-dash__save-btn" onClick={exportRecruitmentsCSV}>
          <Download size={15} /> Export Applications CSV
        </button>
      </div>

      {/* Settings Panel */}
      <div className="admin-rec-settings-card">
        <div className="admin-rec-settings-header">
          <div className="admin-rec-status-badge-row">
            <span className={`admin-rec-status-indicator admin-rec-status-indicator--${recruitmentSettings.isOpen ? 'open' : 'closed'}`}>
              {recruitmentSettings.isOpen ? '● RECRUITMENTS OPEN' : '○ RECRUITMENTS CLOSED'}
            </span>
            <p>Controls candidate access on the <code>/join</code> page.</p>
          </div>
          <button
            type="button"
            className={`admin-rec-toggle-btn ${recruitmentSettings.isOpen ? 'admin-rec-toggle-btn--open' : ''}`}
            onClick={() => setRecruitmentSettings(prev => ({ ...prev, isOpen: !prev.isOpen }))}
          >
            {recruitmentSettings.isOpen ? 'Switch to CLOSED' : 'Switch to OPEN'}
          </button>
        </div>

        <div className="admin-dash__form-grid admin-dash__form-grid--2col" style={{ marginTop: 16 }}>
          <div className="admin-dash__field">
            <label>Drive Title</label>
            <input
              type="text"
              value={recruitmentSettings.title || ''}
              onChange={e => setRecruitmentSettings({ ...recruitmentSettings, title: e.target.value })}
              placeholder="e.g. KLFORGE Recruitment Drive 2026"
              className="admin-dash__input"
            />
          </div>
          <div className="admin-dash__field">
            <label>Hero Subtitle</label>
            <input
              type="text"
              value={recruitmentSettings.subtitle || ''}
              onChange={e => setRecruitmentSettings({ ...recruitmentSettings, subtitle: e.target.value })}
              placeholder="Tagline displayed under hero title"
              className="admin-dash__input"
            />
          </div>
          <div className="admin-dash__field admin-dash__field--full">
            <label>Hero Image Banner URL</label>
            <input
              type="url"
              value={recruitmentSettings.heroImageUrl || ''}
              onChange={e => setRecruitmentSettings({ ...recruitmentSettings, heroImageUrl: e.target.value })}
              placeholder="https://... (Image URL for /join hero banner)"
              className="admin-dash__input"
            />
          </div>
        </div>

        <div className="admin-rec-settings-footer">
          <button
            type="button"
            className="admin-dash__save-btn"
            onClick={saveRecruitmentSettings}
            disabled={recruitmentSettingsSaving}
          >
            {recruitmentSettingsSaving ? 'Saving Settings...' : 'Save Drive Settings'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="admin-rec-stats-grid">
        <div className="admin-rec-stat-card">
          <span className="admin-rec-stat-card__val">{counts.total}</span>
          <span className="admin-rec-stat-card__lbl">TOTAL APPLICANTS</span>
        </div>
        <div className="admin-rec-stat-card admin-rec-stat-card--pending">
          <span className="admin-rec-stat-card__val">{counts.pending}</span>
          <span className="admin-rec-stat-card__lbl">PENDING REVIEW</span>
        </div>
        <div className="admin-rec-stat-card admin-rec-stat-card--shortlisted">
          <span className="admin-rec-stat-card__val">{counts.shortlisted}</span>
          <span className="admin-rec-stat-card__lbl">SHORTLISTED</span>
        </div>
        <div className="admin-rec-stat-card admin-rec-stat-card--accepted">
          <span className="admin-rec-stat-card__val">{counts.accepted}</span>
          <span className="admin-rec-stat-card__lbl">ACCEPTED</span>
        </div>
        <div className="admin-rec-stat-card admin-rec-stat-card--rejected">
          <span className="admin-rec-stat-card__val">{counts.rejected}</span>
          <span className="admin-rec-stat-card__lbl">REJECTED</span>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="admin-dash__filter-row" style={{ marginTop: 24, marginBottom: 20 }}>
        <div className="admin-dash__search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search candidate name, email, roll number, or domain..."
            value={recruitmentSearch}
            onChange={e => setRecruitmentSearch(e.target.value)}
          />
        </div>

        <select
          value={recruitmentFilterDomain}
          onChange={e => setRecruitmentFilterDomain(e.target.value)}
          className="admin-dash__select"
        >
          <option value="all">All Domains</option>
          {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={recruitmentFilterYear}
          onChange={e => setRecruitmentFilterYear(e.target.value)}
          className="admin-dash__select"
        >
          <option value="all">All Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={recruitmentFilterStatus}
          onChange={e => setRecruitmentFilterStatus(e.target.value)}
          className="admin-dash__select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table View */}
      <div className="admin-dash__table-wrap">
        <table className="admin-dash__table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Year</th>
              <th>Primary Domain</th>
              <th>Secondary Domain</th>
              <th>Work Links</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'rgba(255,255,255,0.4)' }}>
                  No recruitment applications match your criteria.
                </td>
              </tr>
            ) : (
              filtered.map(app => (
                <tr key={app._id}>
                  <td>
                    <div className="admin-dash__user-cell">
                      <div className="admin-dash__avatar admin-dash__avatar--fallback">
                        {app.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="admin-dash__name">{app.name}</div>
                        <div className="admin-dash__email">{app.rollNumber} • {app.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-rec-year-badge">{app.year}</span>
                  </td>
                  <td>
                    <span className="admin-rec-domain-tag">{app.primaryDomain}</span>
                  </td>
                  <td>
                    {app.secondaryDomain ? <span className="admin-rec-domain-tag admin-rec-domain-tag--sec">{app.secondaryDomain}</span> : '—'}
                  </td>
                  <td>
                    {Array.isArray(app.workLinks) && app.workLinks.length > 0 ? (
                      <div className="admin-rec-links-row">
                        {app.workLinks.map((l, i) => (
                          <a key={i} href={l.url} target="_blank" rel="noreferrer" className="admin-rec-link-pill" title={l.url}>
                            <ExternalLink size={12} /> {l.title || 'Link'}
                          </a>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <select
                      value={app.status || 'pending'}
                      onChange={e => updateAppStatus(app._id, e.target.value, app.adminNotes)}
                      className={`admin-rec-status-select admin-rec-status-select--${app.status}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <div className="admin-dash__title-actions">
                      <button
                        className="admin-dash__icon-btn"
                        title="View Application Details"
                        onClick={() => {
                          setViewingRecApp(app);
                          setRecAppNotesInput(app.adminNotes || '');
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="admin-dash__icon-btn admin-dash__icon-btn--danger"
                        title="Remove Application"
                        onClick={() => deleteApp(app._id, app.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Application Detail Modal */}
      {viewingRecApp && (
        <div className="admin-dash__overlay" onClick={() => setViewingRecApp(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '1100px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Application Details</h2>
              <button className="admin-dash__close-btn" onClick={() => setViewingRecApp(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="admin-dash__modal-body">
              <div className="admin-rec-app-detail-header">
                <div>
                  <h3>{viewingRecApp.name}</h3>
                  <p>{viewingRecApp.email} • ID: {viewingRecApp.rollNumber}</p>
                </div>
                <span className="admin-rec-year-badge" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                  {viewingRecApp.year}
                </span>
              </div>

              <div className="admin-dash__field">
                <label>Why {viewingRecApp.primaryDomain}? (Primary)</label>
                <div className="admin-rec-motivation-box">
                  {viewingRecApp.whyDomain}
                </div>
              </div>

              {viewingRecApp.secondaryDomain && viewingRecApp.whySecondaryDomain && (
                <div className="admin-dash__field">
                  <label>Why {viewingRecApp.secondaryDomain}? (Secondary)</label>
                  <div className="admin-rec-motivation-box">
                    {viewingRecApp.whySecondaryDomain}
                  </div>
                </div>
              )}

              <div className="admin-dash__modal-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="admin-dash__cancel-btn"
                  style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}
                  onClick={() => deleteApp(viewingRecApp._id, viewingRecApp.name)}
                >
                  <Trash2 size={14} /> Remove Application
                </button>
                <button
                  type="button"
                  className="admin-dash__save-btn"
                  onClick={() => setViewingRecApp(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
