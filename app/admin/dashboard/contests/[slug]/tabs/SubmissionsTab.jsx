'use client';

import React, { useMemo } from 'react';
import {
  Eye, Edit3, Download, Upload, Search, Filter, CalendarClock,
  ImageIcon, FileText, FileVideo, Link2, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react';

export default function SubmissionsTab({
  submissions, historyCycles, activeCycle, cycleFilter, setCycleFilter,
  searchQuery, setSearchQuery, onView, onJudge, formatBytes,
}) {
  const cycleOptions = useMemo(() => {
    const opts = [
      { value: 'all', label: 'All Cycles' },
      { value: 'current', label: 'Current Cycle' },
      ...historyCycles.map((c) => ({ value: String(c.cycleNumber), label: c.cycleLabel || `Cycle #${c.cycleNumber}` })),
    ];
    return opts;
  }, [historyCycles]);

  return (
    <>
      <div className="cm-card">
        <div className="cm-row cm-row--between" style={{ marginBottom: 14 }}>
          <h3 className="cm-card__title" style={{ margin: 0 }}>
            <Upload size={14} /> All Submissions ({submissions.length})
          </h3>
          <div className="cm-row">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                placeholder="Search by name, email, roll…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 32px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: 'inherit',
                  fontSize: '0.84rem',
                  minWidth: 240,
                }}
              />
            </div>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'inherit',
                fontSize: '0.84rem',
              }}
            >
              {cycleOptions.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#0a0a14' }}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="cm-empty">
            <div className="cm-empty__icon"><Upload size={22} /></div>
            <p className="cm-empty__title">No submissions yet</p>
            <p className="cm-empty__desc">Submissions will appear here once participants start submitting.</p>
          </div>
        ) : (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Entry Title</th>
                  <th>Submitted</th>
                  <th>Files</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="cm-row" style={{ gap: 10 }}>
                        <div className="cm-drawer__avatar" style={{ width: 32, height: 32, fontSize: '0.84rem' }}>
                          {(s.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="cm-table__name">{s.name}</div>
                          <div className="cm-table__sub">{s.rollNumber || s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cm-table__name">{s.title || 'Untitled'}</div>
                      <div className="cm-table__sub">{s.description ? s.description.slice(0, 60) + (s.description.length > 60 ? '…' : '') : 'No description'}</div>
                    </td>
                    <td className="cm-table__sub">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                    </td>
                    <td>
                      <span className="cm-badge cm-badge--neutral">
                        {s.files?.length || 0} {s.files?.length === 1 ? 'file' : 'files'}
                      </span>
                    </td>
                    <td>
                      <span className="cm-text-strong">{s.score || 0}</span>
                      <span className="cm-text-muted" style={{ fontSize: '0.72rem' }}> / 100</span>
                    </td>
                    <td>
                      <span className={`cm-badge cm-badge--${s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'danger' : 'info'}`}>
                        {s.status || 'submitted'}
                      </span>
                    </td>
                    <td>
                      <div className="cm-row" style={{ justifyContent: 'flex-end' }}>
                        <button className="cm-btn cm-btn--icon" onClick={() => onView(s)} title="View">
                          <Eye size={14} />
                        </button>
                        <button className="cm-btn cm-btn--icon" onClick={() => onJudge(s)} title="Judge">
                          <Edit3 size={14} />
                        </button>
                        {s.files?.[0]?.url && (
                          <a className="cm-btn cm-btn--icon" href={s.files[0].url} target="_blank" rel="noreferrer" title="Download">
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
