'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/src/components/Footer';
import { 
  Sparkles, 
  Search, 
  Grid, 
  LayoutGrid, 
  Download, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Share2, 
  ImageIcon,
  Check,
  Trophy,
  Award,
  Camera,
  Star
} from 'lucide-react';
import './page.css';

const WINNER_BADGES = [
  { label: '🏆 WEEKLY CHAMPION', tag: 'Gold Champion', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  { label: '📸 SHOT OF THE WEEK', tag: 'Best Photography', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  { label: '🎨 CREATIVE SPOTLIGHT', tag: 'Creative Choice', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.4)' },
  { label: '🌟 HONORABLE MENTION', tag: 'Top Contender', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.4)' },
  { label: '✨ WEEKLY SELECTION', tag: 'Contest Entry', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.4)' },
];

export default function WallOfKLPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState('bento'); // 'bento' | 'masonry' | 'grid'
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wallofkl');
      const data = await res.json();
      if (data.success) {
        setImages(data.images || []);
      }
    } catch (err) {
      console.error('Failed to load wall of KL media:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered images based on search query
  const filteredImages = images.filter((img) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return img.title.toLowerCase().includes(query) || img.filename.toLowerCase().includes(query);
  });

  const activeImage = activeImageIndex !== null ? filteredImages[activeImageIndex] : null;

  const handleNext = (e) => {
    e?.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeImageIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setActiveImageIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, filteredImages]);

  const copyShareLink = () => {
    if (!activeImage) return;
    const shareUrl = `${window.location.origin}${activeImage.url}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBentoVariant = (index) => {
    if (index === 0) return 'hero';
    if (index % 6 === 1) return 'wide';
    if (index % 6 === 3) return 'tall';
    return 'standard';
  };

  return (
    <div className="wallkl-page">
      {/* Ambient background glows */}
      <div className="wallkl-bg-glow-1" />
      <div className="wallkl-bg-glow-2" />

      <main className="wallkl-container">
        {/* Header Section */}
        <header className="wallkl-header">
          <h1 className="wallkl-title">Wall of KL</h1>
        </header>

        {/* Toolbar & Controls */}
        <div className="wallkl-toolbar">
          <div className="wallkl-search-box">
            <Search size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              className="wallkl-search-input"
              placeholder="Search winning captures or titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <X
                size={14}
                style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
                onClick={() => setSearch('')}
              />
            )}
          </div>

          <div className="wallkl-toolbar-right">
            <span className="wallkl-count-badge">
              {filteredImages.length} {filteredImages.length === 1 ? 'Winning Capture' : 'Winning Captures'}
            </span>

            <div className="wallkl-layout-toggles">
              <button
                className={`wallkl-layout-btn ${layoutMode === 'bento' ? 'wallkl-layout-btn--active' : ''}`}
                onClick={() => setLayoutMode('bento')}
                title="Bento Exhibition View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`wallkl-layout-btn ${layoutMode === 'masonry' ? 'wallkl-layout-btn--active' : ''}`}
                onClick={() => setLayoutMode('masonry')}
                title="Masonry Flow"
              >
                <Sparkles size={16} />
              </button>
              <button
                className={`wallkl-layout-btn ${layoutMode === 'grid' ? 'wallkl-layout-btn--active' : ''}`}
                onClick={() => setLayoutMode('grid')}
                title="Uniform Grid"
              >
                <Grid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
            Loading Wall of KL showcase...
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="wallkl-empty">
            <ImageIcon size={48} className="wallkl-empty-icon" />
            <h3 className="wallkl-empty-title">No Contest Captures Found</h3>
            <p className="wallkl-empty-desc">
              {search
                ? `No winning entries matching "${search}". Try searching another keyword.`
                : 'No winning contest entries currently selected for the Wall of KL showcase.'}
            </p>
          </div>
        ) : (
          <div className={`wallkl-gallery wallkl-gallery--${layoutMode}`}>
            {filteredImages.map((img, idx) => {
              const badgeInfo = WINNER_BADGES[idx % WINNER_BADGES.length];
              const variant = layoutMode === 'bento' ? getBentoVariant(idx) : 'standard';
              const displayBadge = img.badge || badgeInfo.label;
              const displayTag = img.tag || (img.author ? `Captured by ${img.author}` : badgeInfo.tag);

              return (
                <div
                  key={img.id}
                  className={`wallkl-card wallkl-card--${variant}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <div className="wallkl-card-img-wrap">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="wallkl-card-img"
                      loading="lazy"
                    />

                    {/* Top Winner Badge Pin */}
                    <div 
                      className="wallkl-winner-badge"
                      style={{ 
                        background: badgeInfo.bg, 
                        borderColor: badgeInfo.border, 
                        color: badgeInfo.color 
                      }}
                    >
                      {displayBadge}
                    </div>

                    <div className="wallkl-card-overlay">
                      <div className="wallkl-card-info">
                        <span className="wallkl-card-tag" style={{ color: badgeInfo.color }}>
                          {displayTag}
                        </span>
                        <h3 className="wallkl-card-title">{img.title}</h3>
                      </div>

                      <div className="wallkl-card-meta">
                        <span>KL FORGE Contest Winner</span>
                        <div className="wallkl-card-actions">
                          <button
                            type="button"
                            className="wallkl-card-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIndex(idx);
                            }}
                            title="Expand High-Res View"
                          >
                            <Maximize2 size={15} />
                          </button>
                          <a
                            href={img.url}
                            download={img.filename}
                            className="wallkl-card-btn"
                            onClick={(e) => e.stopPropagation()}
                            title="Download Image"
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {activeImage && (
        <div className="wallkl-lightbox-overlay" onClick={() => setActiveImageIndex(null)}>
          <button
            type="button"
            className="wallkl-lightbox-close"
            onClick={() => setActiveImageIndex(null)}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>

          {filteredImages.length > 1 && (
            <>
              <button
                type="button"
                className="wallkl-lightbox-nav wallkl-lightbox-nav--prev"
                onClick={handlePrev}
                title="Previous Capture (←)"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="wallkl-lightbox-nav wallkl-lightbox-nav--next"
                onClick={handleNext}
                title="Next Capture (→)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div className="wallkl-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="wallkl-lightbox-img-box">
              <img
                src={activeImage.url}
                alt={activeImage.title}
                className="wallkl-lightbox-img"
              />
            </div>

            <div className="wallkl-lightbox-footer">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                    {activeImage.badge || '🏆 CONTEST WINNING CAPTURE'}
                  </span>
                  {activeImage.author && (
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                      By {activeImage.author}
                    </span>
                  )}
                </div>
                <h3 className="wallkl-lightbox-title">{activeImage.title}</h3>
                <div className="wallkl-lightbox-meta">
                  {activeImage.tag || 'Official KL FORGE Contest Showcase'} • {activeImage.filename}
                </div>
              </div>

              <div className="wallkl-lightbox-actions">
                <button
                  type="button"
                  className="wallkl-btn-action wallkl-btn-action--secondary"
                  onClick={copyShareLink}
                >
                  {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Share2 size={14} />}
                  {copied ? 'Link Copied' : 'Share Image'}
                </button>
                <a
                  href={activeImage.url}
                  download={activeImage.filename}
                  className="wallkl-btn-action wallkl-btn-action--primary"
                >
                  <Download size={14} /> Download High-Res
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
