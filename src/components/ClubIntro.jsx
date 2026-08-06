'use client';
import React, { useEffect, useRef, useState } from 'react';
import './ClubIntro.css';

const stats = [
  { label: 'Members', value: 50, suffix: '+' },
  { label: 'Activities', value: 18, suffix: '+' },
  { label: 'Projects', value: 10, suffix: '+' },
];

const ClubIntro = ({ children }) => {
  const statsRef = useRef(null);
  const animationFrameRef = useRef(0);
  const hasAnimatedRef = useRef(false);
  const [counts, setCounts] = useState(() => stats.map(() => 0));

  useEffect(() => {
    const statsEl = statsRef.current;
    if (!statsEl) return undefined;

    const startCountAnimation = () => {
      const duration = 2500;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        setCounts(stats.map((item) => Math.round(item.value * easedProgress)));

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    // Robust IntersectionObserver observing stats element directly
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimatedRef.current) return;
        hasAnimatedRef.current = true;
        startCountAnimation();
        observer.disconnect();
      },
      { threshold: 0, rootMargin: '50px 0px 50px 0px' }
    );

    observer.observe(statsEl);

    // Safety fallback: if user is on mobile and observer didn't fire within 1.5s, trigger animation anyway
    const fallbackTimer = setTimeout(() => {
      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        startCountAnimation();
      }
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <section className="club-intro" id="what-is-forge">
      <div className="club-intro__container" style={{ position: 'relative', zIndex: 1 }}>
        <span className="club-intro__eyebrow">WHAT IS FORGE?</span>
        <h2 className="club-intro__heading">
          <span className="club-intro__highlight">Code the Future.</span><br />
          Create the Impossible.<br />
          Connect the Innovators.
        </h2>
        <p className="club-intro__subheading">
          KLForge is a community where developers collaborate,
          build impactful ideas, and grow through technology.
        </p>
        <div className="club-intro__stats" ref={statsRef} aria-label="KLForge highlights">
          {stats.map((item, index) => (
            <article key={item.label} className="club-intro__stat-card">
              <span className="club-intro__stat-label">{item.label}</span>
              <strong className="club-intro__stat-value">
                {counts[index]}
                {item.suffix}
              </strong>
            </article>
          ))}
        </div>
        {children ? <div className="club-intro__bento">{children}</div> : null}
      </div>
    </section>
  );
};

export default ClubIntro;
