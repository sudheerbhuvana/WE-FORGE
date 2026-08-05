'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/src/components/Navbar';
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
  Image as ImageIcon,
  Check
} from 'lucide-react';
import './page.css';

export default function WallOfKLPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState('masonry'); // 'masonry' | 'uniform'
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

  return (
    <div className="wallkl-page">
      <Navbar />

      {/* Ambient background glows */}
      <div className="wallkl-bg-glow-1" />
      <div className="wallkl-bg-glow-2" />

      <main className="wallkl-container">
        {/* Header Section */}
        <header className="wallkl-header">
          <div className="wallkl-badge">
            <Sparkles size={14} /> Official Showcase
          </div>
          <h1 className="wallkl-title">Wall of KL</h1>
          <p className="wallkl-subtitle">
            Exploring the finest moments, winning contest entries, and highlight showcases selected directly from the KL FORGE community.
          </p>
        </header>

        {/* Toolbar & Controls */}
        <div className="wallkl-toolbar">
          <div className="wallkl-search-box">
            <Search size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              className="wallkl-search-input"
              placeholder="Search showcase images..."
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
              {filteredImages.length} {filteredImages.length === 1 ? 'Media Item' : 'Media Items'}
            </span>

            <div className="wallkl-layout-toggles">
              <button
                className={`wallkl-layout-btn ${layoutMode === 'masonry' ? 'wallkl-layout-btn--active' : ''}`}
                onClick={() => setLayoutMode('masonry')}
                title="Dynamic Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`wallkl-layout-btn ${layoutMode === 'uniform' ? 'wallkl-layout-btn--active' : ''}`}
                onClick={() => setLayoutMode('uniform')}
                title="Uniform Grid View"
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
            <h3 className="wallkl-empty-title">No Media Found</h3>
            <p className="wallkl-empty-desc">
              {search
                ? `No contest images found matching "${search}". Try another search keyword.`
                : 'No contest images currently available in the contest-selected showcase folder.'}
            </p>
          </div>
        ) : (
          <div className={`wallkl-grid wallkl-grid--${layoutMode}`}>
            {filteredImages.map((img, idx) => (
              <div
                key={img.id}
                className="wallkl-card"
                onClick={() => setActiveImageIndex(idx)}
              >
                <div className="wallkl-card-img-wrap">
                  <img
                    src={img.url}
                    alt={img.title}
                    className="wallkl-card-img"
                    loading="lazy"
                  />
                  <div className="wallkl-card-overlay">
                    <h3 className="wallkl-card-title">{img.title}</h3>
                    <div className="wallkl-card-meta">
                      <span>KL FORGE Contest</span>
                      <div className="wallkl-card-actions">
                        <button
                          type="button"
                          className="wallkl-card-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(idx);
                          }}
                          title="Expand View"
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
            ))}
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
                title="Previous Image (←)"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="wallkl-lightbox-nav wallkl-lightbox-nav--next"
                onClick={handleNext}
                title="Next Image (→)"
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
                <h3 className="wallkl-lightbox-title">{activeImage.title}</h3>
                <div className="wallkl-lightbox-meta">
                  Contest Selected Showcase • {activeImage.filename}
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
