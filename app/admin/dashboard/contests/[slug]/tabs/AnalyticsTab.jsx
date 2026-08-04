'use client';

import React, { useMemo } from 'react';
import {
  BarChart3, Users, Upload, Trophy, TrendingUp, Activity, Star,
} from 'lucide-react';

function StatBlock({ icon: Icon, label, value, variant }) {
  return (
    <div className="cm-stat">
      <div className={`cm-stat__icon ${variant ? `cm-stat__icon--${variant}` : ''}`}>
        <Icon size={18} />
      </div>
      <div className="cm-stat__body">
        <div className="cm-stat__value">{value}</div>
        <div className="cm-stat__label">{label}</div>
      </div>
    </div>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalyticsTab({
  template, historyCycles, submissions,
  totalParticipants, totalSubmissions, winnersPublished,
}) {
  // Daily submissions over last 30 days
  const dailySubmissions = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({ date: d, count: 0 });
    }
    submissions.forEach((s) => {
      const submitted = new Date(s.submittedAt);
      submitted.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex((b) => b.date.getTime() === submitted.getTime());
      if (idx >= 0) buckets[idx].count++;
    });
    return buckets;
  }, [submissions]);

  const maxDaily = Math.max(1, ...dailySubmissions.map((b) => b.count));

  // Participants over cycles
  const participantsByCycle = useMemo(() => {
    return [...historyCycles].reverse().map((c) => ({
      label: c.cycleLabel || `C${c.cycleNumber}`,
      value: c.participantCount || 0,
    }));
  }, [historyCycles]);
  const maxPart = Math.max(1, ...participantsByCycle.map((b) => b.value));

  // Average score
  const avgScore = useMemo(() => {
    if (submissions.length === 0) return 0;
    const scored = submissions.filter((s) => s.score > 0);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length);
  }, [submissions]);

  // Completion rate
  const completionRate = useMemo(() => {
    const completed = historyCycles.filter((c) => c.status === 'results_published').length;
    return historyCycles.length === 0 ? 0 : Math.round((completed / historyCycles.length) * 100);
  }, [historyCycles]);

  // Top categories (from tags)
  const topCategories = useMemo(() => {
    const tags = template?.tags || [];
    return tags.map((t) => {
      const count = submissions.filter((s) => Array.isArray(s.customAnswers) && s.customAnswers.some((a) => String(a.value || '').toLowerCase().includes(t.toLowerCase()))).length;
      return { label: t, value: count };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [template, submissions]);

  const maxTag = Math.max(1, ...topCategories.map((t) => t.value));

  return (
    <>
      {/* Top stats */}
      <div className="cm-grid cm-grid--stat cm-mb-0">
        <StatBlock icon={Users} value={totalParticipants} label="Total Participants" variant="purple" />
        <StatBlock icon={Upload} value={totalSubmissions} label="Total Entries" variant="green" />
        <StatBlock icon={Star} value={avgScore} label="Average Score" variant="orange" />
        <StatBlock icon={Trophy} value={winnersPublished} label="Winners Declared" />
      </div>

      {/* Daily submissions bar chart */}
      <div className="cm-chart">
        <div className="cm-chart__title">
          <span><BarChart3 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Daily Submissions (last 30 days)</span>
          <span className="cm-text-muted">{totalSubmissions} total</span>
        </div>
        <div className="cm-chart__bars">
          {dailySubmissions.map((b, i) => (
            <div
              key={i}
              className="cm-chart__bar"
              style={{ height: `${(b.count / maxDaily) * 100}%`, minHeight: b.count > 0 ? 4 : 1 }}
              data-value={`${fmtDate(b.date)}: ${b.count}`}
              title={`${fmtDate(b.date)}: ${b.count} submissions`}
            />
          ))}
        </div>
        <div className="cm-chart__labels">
          {dailySubmissions.map((b, i) => (
            i % 5 === 0 ? <span key={i}>{fmtDate(b.date)}</span> : <span key={i} />
          ))}
        </div>
      </div>

      {/* Participants by cycle */}
      <div className="cm-chart">
        <div className="cm-chart__title">
          <span><TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Participants by Cycle</span>
          <span className="cm-text-muted">{historyCycles.length} cycles</span>
        </div>
        <div className="cm-chart__bars">
          {participantsByCycle.map((b, i) => (
            <div
              key={i}
              className="cm-chart__bar"
              style={{
                height: `${(b.value / maxPart) * 100}%`,
                minHeight: b.value > 0 ? 4 : 1,
                background: 'linear-gradient(to top, #5cdb95, #71C4FF)',
              }}
              data-value={`${b.label}: ${b.value}`}
              title={`${b.label}: ${b.value} participants`}
            />
          ))}
        </div>
        <div className="cm-chart__labels">
          {participantsByCycle.map((b, i) => (
            <span key={i}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="cm-grid cm-grid--2">
        <div className="cm-card">
          <h3 className="cm-card__title" style={{ margin: '0 0 12px' }}>
            <Activity size={14} /> Contest Completion Rate
          </h3>
          <div className="cm-row">
            <div className="cm-stat__value" style={{ fontSize: '2.4rem' }}>{completionRate}%</div>
          </div>
          <div className="cm-progress" style={{ marginTop: 8 }}>
            <div className="cm-progress__fill" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="cm-text-muted cm-mt-8">
            {historyCycles.filter((c) => c.status === 'results_published').length} of {historyCycles.length} cycles completed
          </p>
        </div>

        <div className="cm-card">
          <h3 className="cm-card__title" style={{ margin: '0 0 12px' }}>
            <Star size={14} /> Top Performing Categories
          </h3>
          {topCategories.length === 0 ? (
            <p className="cm-text-muted" style={{ margin: 0 }}>No tags configured yet.</p>
          ) : (
            <div>
              {topCategories.map((t, i) => (
                <div key={i} className="cm-bar-row">
                  <span className="cm-bar-row__label">{t.label}</span>
                  <div className="cm-bar-row__bar">
                    <div className="cm-bar-row__bar-fill" style={{ width: `${(t.value / maxTag) * 100}%` }} />
                  </div>
                  <span className="cm-bar-row__value">{t.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
