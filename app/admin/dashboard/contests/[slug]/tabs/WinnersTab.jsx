'use client';

import React, { useState } from 'react';
import { Trophy, Crown, Edit3, Download, Megaphone, Star, Award, X } from 'lucide-react';

const RANK_INFO = [
  { rank: 1, label: '1st Place', emoji: '\u{1F947}', cls: 'gold' },
  { rank: 2, label: '2nd Place', emoji: '\u{1F948}', cls: 'silver' },
  { rank: 3, label: '3rd Place', emoji: '\u{1F949}', cls: 'bronze' },
];

export default function WinnersTab({ historyCycles, activeCycle, onEditWinner, onExport }) {
  const [filterCycle, setFilterCycle] = useState('current');

  const cyclesWithResults = historyCycles.filter((c) => c.status === 'results_published');
  const targetCycle = filterCycle === 'current'
    ? activeCycle
    : historyCycles.find((c) => String(c.cycleNumber) === filterCycle);

  const cycle = targetCycle?.status === 'results_published' ? targetCycle : null;

  const getWinner = (rank) => (cycle?.winners || []).find((w) => Number(w.rank) === rank);
  const mentions = (cycle?.winners || []).filter((w) => Number(w.rank) === 99);

  return (
    <>
      <div className="cm-card">
        <div className="cm-row cm-row--between" style={{ marginBottom: 14 }}>
          <h3 className="cm-card__title" style={{ margin: 0 }}>
            <Trophy size={14} /> Winners
          </h3>
          <div className="cm-row">
            <select
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'inherit',
                fontSize: '0.84rem',
              }}
            >
              <option value="current" style={{ background: '#0a0a14' }}>Current cycle</option>
              {cyclesWithResults.map((c) => (
                <option key={c._id} value={String(c.cycleNumber)} style={{ background: '#0a0a14' }}>
                  {c.cycleLabel} (#{c.cycleNumber})
                </option>
              ))}
            </select>
            {cycle && (
              <>
                <button className="cm-btn cm-btn--sm" onClick={() => onEditWinner(cycle)}>
                  <Edit3 size={12} /> Edit Winners
                </button>
                <button className="cm-btn cm-btn--sm" onClick={onExport}>
                  <Download size={12} /> Export
                </button>
              </>
            )}
          </div>
        </div>

        {!cycle ? (
          <div className="cm-empty">
            <div className="cm-empty__icon"><Trophy size={22} /></div>
            <p className="cm-empty__title">No winners published yet</p>
            <p className="cm-empty__desc">Declare winners for the active cycle to publish results.</p>
            {activeCycle && (
              <button className="cm-btn cm-btn--accent cm-mt-16" onClick={() => onEditWinner(activeCycle)}>
                <Trophy size={14} /> Declare Winners
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="cm-row" style={{ marginBottom: 14 }}>
              <span className="cm-badge cm-badge--success">Results Published</span>
              <span className="cm-text-muted">{cycle.cycleLabel} · Cycle #{cycle.cycleNumber}</span>
              {cycle.resultsPublishedAt && (
                <span className="cm-text-muted">
                  Published {new Date(cycle.resultsPublishedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="cm-winner-grid">
              {RANK_INFO.map((r) => {
                const w = getWinner(r.rank);
                return (
                  <div key={r.rank} className={`cm-winner cm-winner--${r.cls}`}>
                    <div className="cm-winner__rank">{r.emoji}</div>
                    <div className="cm-winner__medal">{r.label}</div>
                    {w ? (
                      <>
                        <p className="cm-winner__name">{w.name || w.memberId}</p>
                        <p className="cm-winner__roll">{w.rollNumber || w.email || ''}</p>
                        {w.awardTitle && <span className="cm-winner__award">{w.awardTitle}</span>}
                        {w.judgeNotes && (
                          <div className="cm-winner__notes">"{w.judgeNotes}"</div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="cm-winner__roll" style={{ color: 'rgba(255,255,255,0.4)' }}>Not awarded</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {cycle.announcementNotes && (
              <div className="cm-card cm-mt-16" style={{ marginBottom: 0 }}>
                <div className="cm-row" style={{ marginBottom: 8 }}>
                  <Megaphone size={14} />
                  <span className="cm-text-strong">Judges' Announcement</span>
                </div>
                <div className="cm-text-muted" style={{ whiteSpace: 'pre-wrap' }}>{cycle.announcementNotes}</div>
              </div>
            )}

            {mentions.length > 0 && (
              <div className="cm-card cm-mt-16" style={{ marginBottom: 0 }}>
                <div className="cm-row" style={{ marginBottom: 8 }}>
                  <Star size={14} />
                  <span className="cm-text-strong">Special Mentions</span>
                </div>
                <div className="cm-mentions">
                  {mentions.map((m, i) => (
                    <span key={i} className="cm-mention">
                      <Award size={11} /> {m.name || m.memberId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
