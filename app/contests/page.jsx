'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Clock, Calendar, Users, ArrowRight, Sparkles, Filter, Search, Award, CheckCircle2, Zap, Layers
} from 'lucide-react';
import BackButton from '@/src/components/BackButton';
import Footer from '@/src/components/Footer';
import './page.css';

const TYPE_LABELS = {
  one_time: 'One-Time',
  immediate: 'Immediate',
  recurring_weekly: 'Weekly Series',
  recurring_monthly: 'Monthly Series',
};

export default function ContestsPage() {
  const router = useRouter();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchContests();
  }, []);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contests');
      if (res.ok) {
        setContests(await res.json());
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCountdownString = (cycle) => {
    if (!cycle) return 'TBA';
    const now = new Date();
    const start = new Date(cycle.startTime);
    const end = new Date(cycle.endTime);

    if (now < start) {
      const diffHours = Math.ceil((start - now) / (1000 * 60 * 60));
      return `Starts in ${diffHours}h`;
    } else if (now <= end) {
      const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
      if (diffHours > 24) {
        return `Ends in ${Math.ceil(diffHours / 24)} days`;
      }
      return `Ends in ${diffHours}h`;
    }
    return 'Submissions Closed';
  };

  let filtered = contests.slice();
  if (filterType !== 'all') {
    filtered = filtered.filter(c => c.type === filterType);
  }
  if (filterStatus !== 'all') {
    filtered = filtered.filter(c => c.activeCycle && c.activeCycle.status === filterStatus);
  }
  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    filtered = filtered.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.slug || '').toLowerCase().includes(q)
    );
  }

  return (
    <div className="events-page contests-page">
      <div className="events-page__topbar">
        <BackButton to="/" />
      </div>

      {/* Header matching site layout */}
      <div className="events-page__header">
        <h1 className="events-page__title">Contests &amp; Challenges</h1>
        <p className="events-page__subtitle">
          Participate in weekly, monthly, and hackathon challenges. Build projects, compete, and climb the leaderboard.
        </p>
      </div>

      {/* Catalog Main */}
      <main className="contests-container">
        {/* Controls Row */}
        <div className="contests-controls">
          <div className="contests-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search contests by title, rules, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="contests-filters">
            <div className="contests-chip-group">
              <button
                type="button"
                className={`contests-chip ${filterType === 'all' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All Contests
              </button>
              <button
                type="button"
                className={`contests-chip ${filterType === 'recurring_weekly' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('recurring_weekly')}
              >
                Weekly Series
              </button>
              <button
                type="button"
                className={`contests-chip ${filterType === 'recurring_monthly' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('recurring_monthly')}
              >
                Monthly Series
              </button>
              <button
                type="button"
                className={`contests-chip ${filterType === 'one_time' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('one_time')}
              >
                One-Time / Hackathons
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="contests-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Submissions Open</option>
              <option value="upcoming">Upcoming</option>
              <option value="submission_closed">Judging Phase</option>
              <option value="results_published">Winners Announced</option>
            </select>
          </div>
        </div>

        {/* Loading Grid */}
        {loading ? (
          <div className="contests-loading">
            <div className="contests-spinner" />
            <p>Loading contests catalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="contests-empty">
            <Trophy size={48} />
            <h2>No Contests Found</h2>
            <p>No active competitions match your filter selection. Check back soon for new editions!</p>
          </div>
        ) : (
          <div className="contests-grid">
            {filtered.map((item) => {
              const activeCycle = item.activeCycle;
              const status = activeCycle?.status || (item.isPublished ? 'upcoming' : 'draft');
              const cycleLabel = activeCycle?.cycleLabel || 'Current Edition';

              return (
                <div 
                  key={item._id} 
                  className="contest-card"
                  onClick={() => router.push(`/contests/${item.slug}`)}
                >
                  <div className="contest-card__banner">
                    {item.bannerUrl ? (
                      <img src={item.bannerUrl} alt={item.title} />
                    ) : (
                      <div className="contest-card__banner-fallback">
                        <Trophy size={48} />
                      </div>
                    )}
                    <div className="contest-card__overlay" />
                    
                    <div className="contest-card__badges">
                      <span className="contest-badge contest-badge--type">
                        <Layers size={11} /> {TYPE_LABELS[item.type] || 'Contest'}
                      </span>
                      <span className={`contest-badge contest-badge--${status}`}>
                        {status === 'active' ? '● Submissions Open' :
                         status === 'judging' ? '⏳ Judging Phase' :
                         status === 'results_published' ? '🏆 Winners Out' :
                         status === 'upcoming' ? '🗓️ Upcoming' : status}
                      </span>
                    </div>

                    <div className="contest-card__banner-content">
                      <div className="contest-card__edition">{cycleLabel}</div>
                      <h3 className="contest-card__title">{item.title}</h3>
                    </div>
                  </div>

                  <div className="contest-card__body">
                    <p className="contest-card__desc">
                      {item.description ? item.description.slice(0, 100) + (item.description.length > 100 ? '…' : '') : 'Click to view guidelines, rules, and submit entries.'}
                    </p>

                    <div className="contest-card__meta">
                      <div className="contest-card__meta-item">
                        <Clock size={13} />
                        <span>{getCountdownString(activeCycle)}</span>
                      </div>
                      {activeCycle?.submissionCount > 0 && (
                        <div className="contest-card__meta-item">
                          <Users size={13} />
                          <span>{activeCycle.submissionCount} Entries</span>
                        </div>
                      )}
                    </div>

                    <div className="contest-card__footer">
                      <button type="button" className="contest-card__btn">
                        <span>View Details</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="footer-separator" />
      <Footer />
    </div>
  );
}
