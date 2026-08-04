'use client';

import React from 'react';
import {
  Clock, Users, Upload, Trophy, Calendar, CalendarClock, Eye, Pause, Play,
  Star, Globe, Lock, Tag, FileText, ChevronDown, ChevronRight, Sparkles,
  ListChecks, Check, Hash, Zap, Edit3, Award, Timer, Flag,
} from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function relTime(d) {
  if (!d) return '—';
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ${Math.floor((diff % 86400000) / 3600000)}h`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ${Math.floor((diff % 3600000) / 60000)}m`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m`;
}

function StatCard({ icon: Icon, value, label, sub, variant }) {
  return (
    <div className="cm-stat">
      <div className={`cm-stat__icon ${variant ? `cm-stat__icon--${variant}` : ''}`}>
        <Icon size={18} />
      </div>
      <div className="cm-stat__body">
        <div className="cm-stat__value">{value}</div>
        <div className="cm-stat__label">{label}</div>
        {sub && <div className="cm-stat__sub">{sub}</div>}
      </div>
    </div>
  );
}

function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="cm-collapse">
      <div className="cm-collapse__header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      {open && <div className="cm-collapse__body">{children}</div>}
    </div>
  );
}

export default function OverviewTab({
  template, activeCycle, historyCycles, submissions,
  totalParticipants, totalSubmissions, winnersPublished, daysRemaining,
  totalPreviousCycles, triggerAction, actionBusy, openWinners, openJudging, openEdit,
}) {
  const [tab, setTab] = React.useState('active');

  const schedule = template?.schedule || {};
  const winnerCycle = historyCycles.find((c) => c.status === 'results_published');

  const submittersThisCycle = activeCycle
    ? submissions.filter((s) => s.cycleId === activeCycle._id).length
    : 0;

  return (
    <>
      {/* ===== Stats row ===== */}
      <div className="cm-grid cm-grid--stat cm-mb-0">
        <StatCard icon={Users} value={totalParticipants} label="Participants" />
        <StatCard icon={Upload} value={totalSubmissions} label="Total Submissions" />
        <StatCard
          icon={CalendarClock}
          value={activeCycle ? `Cycle #${activeCycle.cycleNumber}` : '—'}
          label="Current Cycle"
        />
        <StatCard icon={Trophy} value={winnersPublished} label="Winners Published" />
        <StatCard
          icon={Timer}
          value={daysRemaining > 0 ? `${daysRemaining}d` : (activeCycle ? 'Ended' : '—')}
          label="Days Remaining"
        />
        <StatCard
          icon={Zap}
          value={{ one_time: 'One-Time', immediate: 'Immediate', recurring_weekly: 'Weekly', recurring_monthly: 'Monthly' }[template?.type] || 'One-Time'}
          label="Frequency"
        />
        <StatCard icon={Flag} value={totalPreviousCycles} label="Previous Cycles" />
      </div>

      {/* ===== Schedule + details ===== */}
      <div className="cm-grid cm-grid--2">
        <div className="cm-card">
          <div className="cm-row cm-row--between" style={{ marginBottom: 12 }}>
            <h3 className="cm-card__title" style={{ margin: 0 }}>
              <Calendar size={14} /> Contest Schedule
            </h3>
            {template?.type === 'recurring_weekly' && <span className="cm-badge cm-badge--info">Weekly</span>}
            {template?.type === 'recurring_monthly' && <span className="cm-badge cm-badge--info">Monthly</span>}
          </div>

          <div className="cm-detail-list">
            <div className="cm-detail-list__row">
              <div className="cm-detail-list__label">Start Date</div>
              <div className="cm-detail-list__value">{fmtDate(schedule.startDate)}</div>
            </div>
            <div className="cm-detail-list__row">
              <div className="cm-detail-list__label">End Date</div>
              <div className="cm-detail-list__value">{fmtDate(schedule.endDate)}</div>
            </div>
            <div className="cm-detail-list__row">
              <div className="cm-detail-list__label">Countdown</div>
              <div className="cm-detail-list__value">
                {activeCycle?.status === 'active' ? `${relTime(activeCycle.endTime)} until close`
                  : activeCycle?.status === 'upcoming' ? `${relTime(activeCycle.startTime)} until start`
                  : '—'}
              </div>
            </div>
            <div className="cm-detail-list__row">
              <div className="cm-detail-list__label">Frequency</div>
              <div className="cm-detail-list__value">
                {{ one_time: 'One-Time', immediate: 'Immediate', recurring_weekly: 'Recurring Weekly', recurring_monthly: 'Recurring Monthly' }[template?.type] || 'One-Time'}
              </div>
            </div>
          </div>

          {template?.type === 'recurring_weekly' && (
            <div className="cm-detail-list" style={{ marginTop: 12 }}>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Weekly Schedule</div>
                <div className="cm-detail-list__value">
                  Starts every {DAY_NAMES[schedule.startDay ?? 0]} ({schedule.startTime || '00:00'})<br />
                  Ends every {DAY_NAMES[schedule.endDay ?? 6]} ({schedule.endTime || '23:59'})
                </div>
              </div>
            </div>
          )}

          {template?.type === 'recurring_monthly' && (
            <div className="cm-detail-list" style={{ marginTop: 12 }}>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Monthly Schedule</div>
                <div className="cm-detail-list__value">
                  Starts on Day {schedule.startDayOfMonth ?? 1}<br />
                  Ends on Day {schedule.endDayOfMonth ?? 28}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cm-card">
          <h3 className="cm-card__title" style={{ margin: '0 0 12px' }}>
            <FileText size={14} /> Contest Details
          </h3>
          {template?.description && (
            <Collapsible title="Description" defaultOpen>
              <div>{template.description}</div>
            </Collapsible>
          )}
          {template?.rules && (
            <Collapsible title="Rules" defaultOpen={false}>
              <div>{template.rules}</div>
            </Collapsible>
          )}
          {template?.eligibility && (
            <Collapsible title="Eligibility" defaultOpen={false}>
              <div>{template.eligibility}</div>
            </Collapsible>
          )}
          {template?.submissionGuidelines && (
            <Collapsible title="Submission Guidelines" defaultOpen={false}>
              <div>{template.submissionGuidelines}</div>
            </Collapsible>
          )}
          {template?.prizeInfo && (
            <Collapsible title="Prize Information" defaultOpen={false}>
              <div>{template.prizeInfo}</div>
            </Collapsible>
          )}
          <div style={{ marginTop: 10 }}>
            <div className="cm-row">
              {(template?.tags || []).map((t, i) => (
                <span key={i} className="cm-badge cm-badge--neutral"><Tag size={10} /> {t}</span>
              ))}
              <span className="cm-badge cm-badge--info">
                {template?.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                {template?.visibility === 'private' ? 'Private' : 'Public'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Submission form summary ===== */}
      <div className="cm-card">
        <div className="cm-row cm-row--between" style={{ marginBottom: 12 }}>
          <h3 className="cm-card__title" style={{ margin: 0 }}>
            <ListChecks size={14} /> Submission Form Summary
          </h3>
          <button className="cm-btn cm-btn--sm" onClick={openEdit}>
            <Edit3 size={12} /> Edit Form
          </button>
        </div>
        {(template?.customFields || []).length === 0 ? (
          <div className="cm-empty">
            <div className="cm-empty__icon"><ListChecks size={22} /></div>
            <p className="cm-empty__title">No submission fields yet</p>
            <p className="cm-empty__desc">Add fields to collect participant entries.</p>
          </div>
        ) : (
          <div className="cm-req-list">
            {template.customFields.map((f, i) => (
              <div key={i} className="cm-req">
                <span className="cm-req__check"><Check size={14} /></span>
                <span className="cm-req__name">{f.label}</span>
                <span className="cm-badge cm-badge--neutral" style={{ fontSize: '0.7rem' }}>{f.type}</span>
                {f.required && <span className="cm-req__required">REQUIRED</span>}
                {(f.type === 'image' || f.type === 'video' || f.type === 'file') && (
                  <span className="cm-req__meta">≤ {f.maxSizeMB || 10} MB</span>
                )}
                {(f.type === 'image' || f.type === 'link') && (
                  <span className="cm-req__meta">max {f.maxCount || 1}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Active cycle card ===== */}
      <div className="cm-card">
        <div className="cm-row cm-row--between" style={{ marginBottom: 12 }}>
          <h3 className="cm-card__title" style={{ margin: 0 }}>
            <CalendarClock size={14} /> Active Cycle
          </h3>
          {activeCycle && (
            <span className={`cm-badge cm-badge--${activeCycle.status === 'active' ? 'success' : 'warning'}`}>
              {activeCycle.status === 'active' ? 'Active' : activeCycle.status}
            </span>
          )}
        </div>

        {!activeCycle ? (
          <div className="cm-empty">
            <div className="cm-empty__icon"><CalendarClock size={22} /></div>
            <p className="cm-empty__title">No active cycle</p>
            <p className="cm-empty__desc">Trigger a new cycle or wait for the schedule.</p>
          </div>
        ) : (
          <>
            <div className="cm-grid cm-grid--2">
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Cycle Name</div>
                <div className="cm-detail-list__value">{activeCycle.cycleLabel}</div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Cycle Number</div>
                <div className="cm-detail-list__value">#{activeCycle.cycleNumber}</div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Start Time</div>
                <div className="cm-detail-list__value">{fmtDate(activeCycle.startTime)}</div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">End Time</div>
                <div className="cm-detail-list__value">{fmtDate(activeCycle.endTime)}</div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Countdown</div>
                <div className="cm-detail-list__value">
                  {activeCycle.status === 'active' ? `Ends in ${relTime(activeCycle.endTime)}`
                    : activeCycle.status === 'upcoming' ? `Starts in ${relTime(activeCycle.startTime)}`
                    : 'Ended'}
                </div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Participants</div>
                <div className="cm-detail-list__value">{activeCycle.participantCount || 0}</div>
              </div>
              <div className="cm-detail-list__row">
                <div className="cm-detail-list__label">Entries</div>
                <div className="cm-detail-list__value">{activeCycle.submissionCount || 0}</div>
              </div>
            </div>

            <div className="cm-progress" style={{ marginTop: 14 }}>
              <div
                className="cm-progress__fill"
                style={{
                  width: `${Math.min(100, Math.max(0,
                    ((Date.now() - new Date(activeCycle.startTime).getTime()) /
                    Math.max(1, new Date(activeCycle.endTime).getTime() - new Date(activeCycle.startTime).getTime())) * 100
                  ))}%`,
                }}
              />
            </div>

            <div className="cm-row" style={{ marginTop: 14 }}>
              <button className="cm-btn cm-btn--sm" onClick={() => openJudging && openJudging(activeCycle)}>
                <Eye size={12} /> View Entries
              </button>
              <button className="cm-btn cm-btn--sm" disabled={actionBusy}
                onClick={() => triggerAction('extend_deadline', { hours: 24 })}>
                <Timer size={12} /> Extend +24h
              </button>
              <button className="cm-btn cm-btn--sm" disabled={actionBusy}
                onClick={() => triggerAction('end_early')}>
                <Flag size={12} /> End Cycle
              </button>
              <button className="cm-btn cm-btn--accent cm-btn--sm" onClick={() => openWinners(activeCycle)}>
                <Trophy size={12} /> Declare Winners
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
