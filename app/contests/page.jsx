'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Clock, Calendar, Users, ArrowRight, Sparkles, Filter, Search, Award, CheckCircle2, Zap
} from 'lucide-react';
import BackButton from '../../src/components/BackButton';
import Footer from '../../src/components/Footer';
import './page.css';

const TYPE_LABELS = {
  one_time: 'One-Time',
  immediate: 'Immediate',
  recurring_weekly: 'Weekly',
  recurring_monthly: 'Monthly',
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
    return 'Deadline Passed';
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
    <div className="contests-page">
      <BackButton href="/" label="Back to Home" />

      {/* Hero Section */}
      <section className="contests-hero">
        <div className="contests-hero__glow" />
        <div className="contests-hero__content">
          <div className="contests-hero__badge">
            <Trophy size={14} />
            <span>KLFORGE COMPETITIONS</span>
          </div>
          <h1 className="contests-hero__title">Challenge Yourself & Build</h1>
          <p className="contests-hero__subtitle">
            Participate in weekly, monthly, and featured challenges. Win prizes, earn recognition, and build your portfolio.
          </p>
        </div>
      </section>

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
                className={`contests-chip ${filterType === 'all' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All Types
              </button>
              <button
                className={`contests-chip ${filterType === 'recurring_weekly' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('recurring_weekly')}
              >
                Weekly
              </button>
              <button
                className={`contests-chip ${filterType === 'recurring_monthly' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('recurring_monthly')}
              >
                Monthly
              </button>
              <button
                className={`contests-chip ${filterType === 'one_time' ? 'contests-chip--active' : ''}`}
                onClick={() => setFilterType('one_time')}
              >
                One-Time
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="contests-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Ongoing (Submissions Open)</option>
              <option value="upcoming">Upcoming</option>
              <option value="submission_closed">Judging / Ended</option>
              <option value="results_published">Results Declared</option>
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
            <p>No active competitions match your current filter selection. Check back soon!</p>
          </div>
        ) : (
          <div className="contests-grid">
            {filtered.map((item) => {
              const cycle = item.activeCycle;
              const status = cycle?.status || 'upcoming';
              const countdownStr = getCountdownString(cycle);

              return (
                <div key={item._id} className="contest-card" onClick={() => router.push(`/contests/${item.slug}`)}>
                  {/* Banner */}
                  <div className="contest-card__banner">
                    {item.bannerUrl ? (
                      <img src={item.bannerUrl} alt={item.title} />
                    ) : (
                      <div className="contest-card__banner-fallback">
                        <Trophy size={36} />
                      </div>
                    )}
                    <div className="contest-card__banner-overlay" />
                    
                    <div className="contest-card__top-badges">
                      <span className="contest-type-badge">
                        {TYPE_LABELS[item.type] || 'Contest'}
                      </span>
                      <span className={`contest-status-pill contest-status-pill--${status}`}>
                        {status === 'active' ? '● ONGOING' : status === 'results_published' ? '🏆 RESULTS OUT' : status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="contest-card__body">
                    <h3 className="contest-card__title">{item.title}</h3>
                    <p className="contest-card__desc">{item.description || 'Join this competition and showcase your work.'}</p>

                    {cycle && (
                      <div className="contest-card__cycle-lbl">
                        <Zap size={13} /> {cycle.cycleLabel}
                      </div>
                    )}

                    {/* Stats & Countdown */}
                    <div className="contest-card__footer">
                      <div className="contest-card__info-row">
                        <span className="contest-card__countdown">
                          <Clock size={13} /> {countdownStr}
                        </span>
                        <span className="contest-card__participants">
                          <Users size={13} /> {cycle?.participantCount || 0} participants
                        </span>
                      </div>

                      <button className="contest-card__action-btn">
                        <span>View Contest</span>
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

      <Footer />
    </div>
  );
}
