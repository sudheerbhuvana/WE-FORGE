'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

/**
 * AppleCardsCarousel — Apple.com-style horizontal scroll-snap carousel
 * with click-to-expand detail modal.
 *
 * Modeled on ui.aceternity.com's `apple-cards-carousel`. Self-contained,
 * uses framer-motion + lucide-react (already in the project).
 *
 * Props:
 *   items: Array<{
 *     src: string,           // image URL
 *     title: string,
 *     category: string,      // eyebrow tag (e.g. "Hackathon", "Workshop")
 *     content: ReactNode,    // body shown in the expanded modal
 *   }>
 *   eyebrow?: string         // small label above the section title
 *   title?: string           // section heading
 *   sub?: string             // section subhead
 */
export default function AppleCardsCarousel({
    items = [],
    eyebrow = 'Featured',
    title = 'What we build',
    sub = 'A glimpse of the work, moments, and ideas that move KLForge forward.',
}) {
    const [openIdx, setOpenIdx] = useState(null);
    const [scrollerEl, setScrollerEl] = useState(null);
    const modalRef = useRef(null);

    // ── Close modal on outside click / Escape ──────────────
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setOpenIdx(null); };
        if (openIdx !== null) {
            document.addEventListener('mousedown', (e) => {
                if (modalRef.current && !modalRef.current.contains(e.target)) {
                    setOpenIdx(null);
                }
            });
            document.addEventListener('keydown', onKey);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [openIdx]);

    // ── Scroll helpers ─────────────────────────────────────
    const scrollByCards = useCallback((dir) => {
        if (!scrollerEl) return;
        const cardWidth = scrollerEl.querySelector('.apple-card')?.offsetWidth || 320;
        const gap = 16;
        scrollerEl.scrollBy({ left: dir * (cardWidth + gap), behavior: 'smooth' });
    }, [scrollerEl]);

    if (!items || items.length === 0) return null;

    const openItem = openIdx !== null ? items[openIdx] : null;

    return (
        <section className="apple-cards">
            <div className="apple-cards__container">
                <header className="apple-cards__header">
                    <span className="apple-cards__eyebrow">
                        <Sparkles size={12} aria-hidden="true" /> {eyebrow}
                    </span>
                    <h2 className="apple-cards__title">{title}</h2>
                    {sub && <p className="apple-cards__sub">{sub}</p>}

                    <div className="apple-cards__nav">
                        <button
                            type="button"
                            className="apple-cards__nav-btn"
                            aria-label="Scroll left"
                            onClick={() => scrollByCards(-1)}
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="apple-cards__nav-btn"
                            aria-label="Scroll right"
                            onClick={() => scrollByCards(1)}
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div
                    className="apple-cards__scroller"
                    ref={setScrollerEl}
                    role="region"
                    aria-label="Featured carousel"
                >
                    {items.map((item, idx) => (
                        <button
                            key={`${item.src}-${idx}`}
                            type="button"
                            className="apple-card"
                            onClick={() => setOpenIdx(idx)}
                            aria-label={`Open ${item.title}`}
                        >
                            <div className="apple-card__media">
                                <img src={item.src} alt={item.title} loading="lazy" />
                                <div className="apple-card__overlay" />
                                <div className="apple-card__meta">
                                    <span className="apple-card__category">{item.category}</span>
                                    <h3 className="apple-card__title">{item.title}</h3>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Expanded modal */}
            <AnimatePresence>
                {openItem && (
                    <motion.div
                        className="apple-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setOpenIdx(null)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <motion.div
                            ref={modalRef}
                            className="apple-modal__inner"
                            initial={{ y: 30, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="apple-modal__close"
                                onClick={() => setOpenIdx(null)}
                                aria-label="Close"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                            <div className="apple-modal__hero">
                                <img src={openItem.src} alt={openItem.title} />
                                <span className="apple-modal__category">{openItem.category}</span>
                            </div>
                            <div className="apple-modal__body">
                                <h2 className="apple-modal__title">{openItem.title}</h2>
                                <div className="apple-modal__content">{openItem.content}</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}