'use client';

import React, { useState } from 'react';
import { Download, Search, ExternalLink, Eye, X, Trash2 } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import '../../../app/admin/dashboard/AdminDashboard.css';

export default function RecruitmentsSection({
  recruitmentSettings: initialSettings,
  recruitmentApps,
  adminInfo,
  refreshData
}) {
  const userPerms = Array.isArray(adminInfo?.permissions) ? adminInfo.permissions : [];
  const isElite = adminInfo?.isElite || false;

  const canViewSettings = isElite || userPerms.includes('recruitments.view_settings') || userPerms.includes('recruitments.manage_settings');
  const canManageSettings = isElite || userPerms.includes('recruitments.manage_settings');
  const canViewApplications = isElite || userPerms.includes('recruitments.view_applications');
  const canExport = isElite || userPerms.includes('recruitments.export_applications');
  const canChangeStatus = isElite || userPerms.includes('recruitments.change_app_status');
  const canDelete = isElite || userPerms.includes('recruitments.delete_applications');

  const [recruitmentSettings, setRecruitmentSettings] = useState(initialSettings || { isOpen: true, title: '', subtitle: '', description: '', heroImageUrl: '' });
  const [recruitmentSettingsSaving, setRecruitmentSettingsSaving] = useState(false);
  const [recruitmentFilterDomain, setRecruitmentFilterDomain] = useState('all');
  const [recruitmentFilterYear, setRecruitmentFilterYear] = useState('all');
  const [recruitmentFilterStatus, setRecruitmentFilterStatus] = useState('all');
  const [recruitmentSearch, setRecruitmentSearch] = useState('');
  const [viewingRecApp, setViewingRecApp] = useState(null);
  const [recAppNotesInput, setRecAppNotesInput] = useState('');
  const [appDeleteTarget, setAppDeleteTarget] = useState(null);
  const [deletingApp, setDeletingApp] = useState(false);

  const handleDeleteClick = (id, name) => {
    if (!canDelete) return;
    setAppDeleteTarget({ id, name });
  };

  const confirmDeleteApp = async () => {
    if (!appDeleteTarget) return;
    setDeletingApp(true);
    try {
      const res = await fetch(`/api/recruitments/applications?id=${appDeleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete application');
      if (viewingRecApp && viewingRecApp._id === appDeleteTarget.id) setViewingRecApp(null);
      setAppDeleteTarget(null);
      if (refreshData) refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingApp(false);
    }
  };

  const saveRecruitmentSettings = async () => {
    if (!canManageSettings) return;
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
    if (!canChangeStatus) return;
    const res = await fetch('/api/recruitments/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminNotes: notes }),
    });
    if (res.ok && refreshData) refreshData();
  };

  const exportRecruitmentsCSV = () => {
    if (!canExport) return;
    const headers = ['Name', 'Email', 'Roll Number', 'Year', 'Primary Domain', 'Why Primary Domain', 'Secondary Domain', 'Why Secondary Domain', 'Status', 'Submitted At', 'Work Links'];
    const rows = recruitmentApps.map(app => [
      `"${(app.name || '').replace(/"/g, '""')}"`,
      `"${(app.email || '').replace(/"/g, '""')}"`,
      `"${(app.rollNumber || '').replace(/"/g, '""')}"`,
      `"${(app.year || '').replace(/"/g, '""')}"`,
      `"${(app.primaryDomain || '').replace(/"/g, '""')}"`,
      `"${(app.whyDomain || '').replace(/"/g, '""')}"`,
      `"${(app.secondaryDomain || '').replace(/"/g, '""')}"`,
      `"${(app.whySecondaryDomain || '').replace(/"/g, '""')}"`,
      `"${(app.status || '').replace(/"/g, '""')}"`,
      `"${new Date(app.submittedAt).toLocaleDateString()}"`,
      `"${(app.workLinks || []).map(l => l.url).join(' | ').replace(/"/g, '""')}"`
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
        {canExport && (
          <button className="admin-dash__save-btn" onClick={exportRecruitmentsCSV}>
            <Download size={15} /> Export Applications CSV
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {canViewSettings && (
        <div className="admin-rec-settings-card">
          <div className="admin-rec-settings-header">
            <div className="admin-rec-status-badge-row">
              <span className={`admin-rec-status-indicator admin-rec-status-indicator--${recruitmentSettings.isOpen ? 'open' : 'closed'}`}>
                {recruitmentSettings.isOpen ? '● RECRUITMENTS OPEN' : '○ RECRUITMENTS CLOSED'}
              </span>
              <p>Controls candidate access on the <code>/join</code> page.</p>
            </div>
            {canManageSettings && (
              <button
                type="button"
                className={`admin-rec-toggle-btn ${recruitmentSettings.isOpen ? 'admin-rec-toggle-btn--open' : ''}`}
                onClick={() => setRecruitmentSettings(prev => ({ ...prev, isOpen: !prev.isOpen }))}
              >
                {recruitmentSettings.isOpen ? 'Switch to CLOSED' : 'Switch to OPEN'}
              </button>
            )}
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
                disabled={!canManageSettings}
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
                disabled={!canManageSettings}
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
                disabled={!canManageSettings}
              />
            </div>
          </div>

          {canManageSettings && (
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
          )}
        </div>
      )}

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
                    <div>
                      <div className="admin-dash__name" style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{app.name}</div>
                      <div className="admin-dash__email" style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 }}>{app.rollNumber} • {app.email}</div>
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
                    {canChangeStatus ? (
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
                    ) : (
                      <span className={`admin-rec-status-select admin-rec-status-select--${app.status}`} style={{ opacity: 0.85, cursor: 'default' }}>
                        {(app.status || 'pending').toUpperCase()}
                      </span>
                    )}
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
                      {canDelete && (
                        <button
                          className="admin-dash__icon-btn admin-dash__icon-btn--danger"
                          title="Remove Application"
                          onClick={() => handleDeleteClick(app._id, app.name)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="admin-mob-cards">
        {filtered.length === 0 ? (
          <div className="admin-dash__empty" style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            No recruitment applications match your criteria.
          </div>
        ) : (
          filtered.map(app => (
            <div key={app._id} className="admin-mob-card" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{app.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>{app.rollNumber} • {app.email}</div>
                </div>
                <span className="admin-rec-year-badge">{app.year}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <span className="admin-rec-domain-tag">{app.primaryDomain}</span>
                {app.secondaryDomain && (
                  <span className="admin-rec-domain-tag admin-rec-domain-tag--sec">{app.secondaryDomain}</span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                  {new Date(app.submittedAt).toLocaleDateString()}
                </span>
              </div>

              {Array.isArray(app.workLinks) && app.workLinks.length > 0 && (
                <div className="admin-rec-links-row" style={{ marginBottom: 12 }}>
                  {app.workLinks.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noreferrer" className="admin-rec-link-pill" title={l.url}>
                      <ExternalLink size={12} /> {l.title || 'Link'}
                    </a>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
                {canChangeStatus ? (
                  <select
                    value={app.status || 'pending'}
                    onChange={e => updateAppStatus(app._id, e.target.value, app.adminNotes)}
                    className={`admin-rec-status-select admin-rec-status-select--${app.status}`}
                    style={{ flex: 1 }}
                  >
                    <option value="pending">Pending</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ) : (
                  <span className={`admin-rec-status-select admin-rec-status-select--${app.status}`} style={{ flex: 1, opacity: 0.85, cursor: 'default', textAlign: 'center' }}>
                    {(app.status || 'pending').toUpperCase()}
                  </span>
                )}

                <button
                  type="button"
                  className="admin-mob-btn admin-mob-btn--edit"
                  onClick={() => {
                    setViewingRecApp(app);
                    setRecAppNotesInput(app.adminNotes || '');
                  }}
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <Eye size={14} /> Details
                </button>

                {canDelete && (
                  <button
                    type="button"
                    className="admin-mob-btn admin-mob-btn--delete"
                    onClick={() => handleDeleteClick(app._id, app.name)}
                    style={{ padding: '8px 12px' }}
                    title="Remove Application"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
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
                  onClick={() => handleDeleteClick(viewingRecApp._id, viewingRecApp.name)}
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

      <ConfirmDialog
        isOpen={Boolean(appDeleteTarget)}
        title="Delete Recruitment Application"
        description={appDeleteTarget ? `Are you sure you want to delete the recruitment application from "${appDeleteTarget.name}"? This cannot be undone.` : ''}
        confirmText="Delete Application"
        variant="destructive"
        loading={deletingApp}
        onConfirm={confirmDeleteApp}
        onCancel={() => setAppDeleteTarget(null)}
      />
    </div>
  );
}
