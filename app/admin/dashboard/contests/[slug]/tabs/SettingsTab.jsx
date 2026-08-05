'use client';

import React from 'react';
import {
  Settings as SettingsIcon, FileText, Calendar, ListChecks, Eye, Lock, Award,
  Megaphone, AlertTriangle, Edit3, Copy, Trash2, Globe, Download, ExternalLink,
} from 'lucide-react';

function Section({ icon: Icon, title, desc, onEdit, children }) {
  return (
    <div className="cm-settings-section">
      <div className="cm-row cm-row--between" style={{ marginBottom: 4 }}>
        <h3 className="cm-settings-section__title" style={{ margin: 0 }}>
          <Icon size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {title}
        </h3>
        {onEdit && (
          <button className="cm-btn cm-btn--sm" onClick={onEdit}>
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>
      {desc && <p className="cm-settings-section__desc">{desc}</p>}
      {children}
    </div>
  );
}

export default function SettingsTab({ template, onEdit, triggerAction, actionBusy, onDelete }) {
  const cycleSchedule = template?.schedule || {};

  return (
    <>
      <div className="cm-card">
        <h3 className="cm-card__title" style={{ margin: '0 0 4px' }}>
          <SettingsIcon size={14} /> Settings
        </h3>
        <p className="cm-text-muted" style={{ margin: '0 0 12px' }}>
          Manage every aspect of this contest. Most sections open the full editor.
        </p>

        <div className="cm-settings-grid">
          <Section icon={FileText} title="General" desc="Title, banner, description, and tags."
            onEdit={onEdit}>
            <div className="cm-row" style={{ flexWrap: 'wrap' }}>
              <span className="cm-text-muted">Title:</span>
              <span className="cm-text-strong">{template?.title}</span>
              <span className="cm-text-muted">Type:</span>
              <span className="cm-text-strong">{{ one_time: 'One-Time', immediate: 'Immediate', recurring_weekly: 'Weekly', recurring_monthly: 'Monthly' }[template?.type] || 'One-Time'}</span>
            </div>
          </Section>

          <Section icon={Calendar} title="Schedule" desc="Start/end dates and recurring window."
            onEdit={onEdit}>
            <div className="cm-row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <span className="cm-text-muted">Start:</span>
              <span className="cm-text-strong">{cycleSchedule.startDate ? new Date(cycleSchedule.startDate).toLocaleDateString() : '—'}</span>
              <span className="cm-text-muted">End:</span>
              <span className="cm-text-strong">{cycleSchedule.endDate ? new Date(cycleSchedule.endDate).toLocaleDateString() : '—'}</span>
            </div>
          </Section>

          <Section icon={ListChecks} title="Submission Form" desc="Custom fields participants fill in."
            onEdit={onEdit}>
            <span className="cm-text-muted">{(template?.customFields || []).length} fields configured</span>
          </Section>

          <Section icon={Eye} title="Visibility" desc="Controls who can see and submit to this contest."
            onEdit={onEdit}>
            <div className="cm-row">
              {template?.visibility === 'private' ? <Lock size={14} /> : <Globe size={14} />}
              <span className="cm-text-strong">{template?.visibility === 'private' ? 'Private' : 'Public'}</span>
              {template?.featured && <span className="cm-badge cm-badge--warning">Featured</span>}
              {template?.isPublished ? (
                <span className="cm-badge cm-badge--success">Published</span>
              ) : (
                <span className="cm-badge cm-badge--neutral">Draft</span>
              )}
            </div>
          </Section>

          <Section icon={FileText} title="Rules" desc="Rules of the contest." onEdit={onEdit}>
            <p className="cm-text-muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {template?.rules || 'No rules set yet.'}
            </p>
          </Section>

          <Section icon={Award} title="Prizes" desc="Prize information for winners." onEdit={onEdit}>
            <p className="cm-text-muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {template?.prizeInfo || 'No prize information yet.'}
            </p>
          </Section>

          <Section icon={Megaphone} title="Notifications" desc="Winners publication & reminder emails.">
            <span className="cm-text-muted">Managed through the contest scheduler.</span>
          </Section>
        </div>
      </div>

      {/* Quick actions card */}
      <div className="cm-card">
        <h3 className="cm-card__title" style={{ margin: '0 0 12px' }}>
          <SettingsIcon size={14} /> Quick Actions
        </h3>
        <div className="cm-actions-grid">
          <button className="cm-btn" onClick={onEdit}><Edit3 size={14} /> Edit Contest</button>
          <button className="cm-btn" disabled={actionBusy}
            onClick={() => triggerAction(template?.isPublished ? 'unpublish' : 'publish')}>
            {template?.isPublished ? 'Unpublish' : 'Publish'}
          </button>
          <button className="cm-btn" disabled={actionBusy}
            onClick={() => triggerAction(template?.isPaused ? 'resume' : 'pause')}>
            {template?.isPaused ? 'Resume Contest' : 'Pause Contest'}
          </button>
          <button className="cm-btn" disabled={actionBusy} onClick={() => triggerAction('extend_deadline', { hours: 24 })}>
            Extend Deadline +24h
          </button>
          <button className="cm-btn" disabled={actionBusy} onClick={() => triggerAction('end_early')}>
            End Current Cycle
          </button>
          <button className="cm-btn" disabled={actionBusy} onClick={() => triggerAction('duplicate')}>
            <Copy size={14} /> Duplicate Contest
          </button>
          <a className="cm-btn" href={`/contests/${template?.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> View Public Page
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div className="cm-danger-zone">
        <h3 className="cm-danger-zone__title">
          <AlertTriangle size={14} /> Danger Zone
        </h3>
        <p className="cm-danger-zone__desc">
          Deleting this contest will permanently remove all cycles, submissions, and winner records tied to it.
          This action cannot be undone.
        </p>
        <button className="cm-btn cm-btn--danger" disabled={actionBusy} onClick={onDelete}>
          <Trash2 size={14} /> Delete Contest
        </button>
      </div>
    </>
  );
}
