'use client';

import React, { useState, useMemo } from 'react';
import { CalendarClock, Trophy, Users, Upload, Filter, Award, ChevronRight } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function getWinnerName(cycle) {
  const w = (cycle.winners || []).find((x) => Number(x.rank) === 1);
  return w?.name || w?.memberId || '—';
}

export default function CyclesTab({ historyCycles, activeCycle }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = [...historyCycles];
    if (filter === 'active') {
      list = list.filter((c) => c.status === 'active' || c.status === 'upcoming' || c.status === 'submission_closed' || c.status === 'judging');
    } else if (filter === 'completed') {
      list = list.filter((c) => c.status === 'results_published');
    } else if (filter === 'archived') {
      list = list.filter((c) => c.status === 'archived');
    }
    return list;
  }, [historyCycles, filter]);

  return (
    <div className="cm-card">
      <div className="cm-row cm-row--between" style={{ marginBottom: 14 }}>
        <h3 className="cm-card__title" style={{ margin: 0 }}>
          <CalendarClock size={14} /> Cycle History ({historyCycles.length})
        </h3>
        <div className="cm-row">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`cm-btn cm-btn--sm ${filter === f.id ? 'cm-btn--primary' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="cm-empty">
          <div className="cm-empty__icon"><CalendarClock size={22} /></div>
          <p className="cm-empty__title">No cycles yet</p>
          <p className="cm-empty__desc">Once the first cycle runs, it'll show up here.</p>
        </div>
      ) : (
        <div className="cm-timeline">
          {filtered.map((c) => {
            const isCurrent = activeCycle && c._id === activeCycle._id;
            const isCompleted = c.status === 'results_published';
            const statusClass = isCurrent ? 'cm-timeline__item--current' : isCompleted ? 'cm-timeline__item--completed' : '';

            return (
              <div key={c._id} className={`cm-timeline__item ${statusClass}`}>
                <div className="cm-timeline__head">
                  <span className="cm-timeline__title">{c.cycleLabel || `Cycle #${c.cycleNumber}`}</span>
                  <span className={`cm-badge cm-badge--${c.status === 'active' ? 'success' : c.status === 'results_published' ? 'purple' : 'neutral'}`}>
                    {c.status === 'active' ? 'Active' : c.status === 'results_published' ? 'Completed' : c.status}
                  </span>
                </div>
                <div className="cm-timeline__date">
                  {fmtDate(c.startTime)} → {fmtDate(c.endTime)}
                </div>
                <div className="cm-timeline__stats">
                  <span><Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> <strong>{c.participantCount || 0}</strong> Participants</span>
                  <span><Upload size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> <strong>{c.submissionCount || 0}</strong> Entries</span>
                  {isCompleted && (
                    <span><Trophy size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Winner: <strong>{getWinnerName(c)}</strong></span>
                  )}
                  {c.status === 'results_published' && c.resultsPublishedAt && (
                    <span className="cm-text-muted">Results {fmtDate(c.resultsPublishedAt)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
