'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Search, Grid3x3, Rows3, LayoutGrid, Star, Trash2, FolderInput, 
  Share2, Eye, X, Plus, Tag, FolderKanban, CheckCircle, Video, Edit3, Download,
  Image as ImageIcon, HardDrive, CheckSquare, Square, RefreshCw, Sparkles, Filter,
  Info, ExternalLink, ArrowUpDown, Folder
} from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function MediaSection({
  media = [],
  events = [],
  mediaFolders = [],
  refreshData
}) {
  // Navigation & Filtering
  const [mediaFilterFolder, setMediaFilterFolder] = useState('all');
  const [mediaFilterType, setMediaFilterType] = useState('all'); // 'all' | 'image' | 'video'
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaOnlyFavorites, setMediaOnlyFavorites] = useState(false);
  const [selectedTag, setSelectedTag] = useState('all');
  const [mediaSort, setMediaSort] = useState('newest');
  const [mediaLayout, setMediaLayout] = useState('grid'); // 'grid' | 'list' | 'masonry'

  // Selection & Inspector
  const [selectedMedia, setSelectedMedia] = useState(new Set());
  const [inspectorMedia, setInspectorMedia] = useState(null); // Detailed Lightbox/Inspector modal
  const [moveTarget, setMoveTarget] = useState(null);
  const [mediaDeleteConfirm, setMediaDeleteConfirm] = useState(null);

  // Folder creation
  const [showFolderCreateModal, setShowFolderCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Upload modal state
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [mediaEventTag, setMediaEventTag] = useState('General');
  const [mediaUploadTags, setMediaUploadTags] = useState('');
  const [mediaUploadTitle, setMediaUploadTitle] = useState('');
  const [mediaUploadDesc, setMediaUploadDesc] = useState('');
  const [mediaUploadFavorite, setMediaUploadFavorite] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  // Drag-and-drop overlay
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Toast / Messages
  const [toastMsg, setToastMsg] = useState('');
  const [error, setError] = useState('');

  // Auto-clear toast
  const showToast = (text) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Derive unique folders list with meta counts
  const folderCounts = media.reduce((acc, item) => {
    const fName = item.folder || item.eventName || 'General';
    acc[fName] = (acc[fName] || 0) + 1;
    return acc;
  }, {});

  const explicitFolders = mediaFolders.map(f => typeof f === 'object' ? f.name : f).filter(Boolean);
  const allFolders = Array.from(new Set(['General', ...explicitFolders, ...Object.keys(folderCounts)])).sort();

  // Storage and type breakdown stats
  const totalSizeBytes = media.reduce((acc, m) => acc + (m.fileSize || 0), 0);
  const imageCount = media.filter(m => m.type === 'image' || (!m.type && String(m.url).match(/\.(jpg|jpeg|png|webp|gif)/i))).length;
  const videoCount = media.filter(m => m.type === 'video' || (!m.type && String(m.url).match(/\.(mp4|webm|mov|mkv)/i))).length;
  const favCount = media.filter(m => m.favorite).length;

  // Derive filter tags list
  const allTags = Array.from(new Set(media.flatMap((m) => Array.isArray(m.tags) ? m.tags : []))).sort();

  // ── Drag & Drop Event Handlers ────────────────────────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      const newItems = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }));
      setUploadQueue((prev) => [...prev, ...newItems]);
      setShowMediaUpload(true);
    }
  };

  // ── Filter & Sort Pipeline ─────────────────────────────────
  let list = media.slice();

  // Folder filter
  if (mediaFilterFolder !== 'all') {
    list = list.filter((m) => (m.folder || m.eventName || 'General') === mediaFilterFolder);
  }

  // Type filter
  if (mediaFilterType === 'image') {
    list = list.filter(m => m.type === 'image' || (!m.type && String(m.url).match(/\.(jpg|jpeg|png|webp|gif)/i)));
  } else if (mediaFilterType === 'video') {
    list = list.filter(m => m.type === 'video' || (!m.type && String(m.url).match(/\.(mp4|webm|mov|mkv)/i)));
  }

  // Favorites filter
  if (mediaOnlyFavorites) {
    list = list.filter((m) => m.favorite);
  }

  // Tag filter
  if (selectedTag !== 'all') {
    list = list.filter((m) => Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase()));
  }

  // Search filter
  if (mediaSearch.trim()) {
    const q = mediaSearch.trim().toLowerCase();
    list = list.filter((m) =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.folder || m.eventName || '').toLowerCase().includes(q) ||
      (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Sort logic
  list.sort((a, b) => {
    if (mediaSort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (mediaSort === 'name') return (a.title || a.folder || '').localeCompare(b.title || b.folder || '');
    if (mediaSort === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // ── Multi-select Handlers ──────────────────────────────────
  const toggleSelect = (id) => {
    const next = new Set(selectedMedia);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMedia(next);
  };

  const selectAllVisible = () => {
    if (selectedMedia.size === list.length && list.length > 0) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(list.map((m) => m._id || m.id)));
    }
  };

  // ── Single & Bulk Actions ──────────────────────────────────
  const toggleFavorite = async (m) => {
    const id = m._id || m.id;
    try {
      const nextFav = !m.favorite;
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: nextFav }),
      });
      if (res.ok) {
        if (inspectorMedia && (inspectorMedia._id === id || inspectorMedia.id === id)) {
          setInspectorMedia({ ...inspectorMedia, favorite: nextFav });
        }
        showToast(nextFav ? '⭐ Added to favorites' : 'Removed from favorites');
        if (refreshData) refreshData();
      }
    } catch (err) { console.error(err); }
  };

  const handleMediaDelete = async (id) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMediaDeleteConfirm(null);
        if (inspectorMedia && (inspectorMedia._id === id || inspectorMedia.id === id)) {
          setInspectorMedia(null);
        }
        showToast('Asset permanently deleted');
        if (refreshData) refreshData();
      }
    } catch (err) { console.error(err); }
  };

  const copyShareLink = (m) => {
    if (navigator.clipboard && m.url) {
      navigator.clipboard.writeText(m.url);
      showToast('📋 Link copied to clipboard');
    }
  };

  const downloadAsset = (m) => {
    if (!m.url) return;
    const a = document.createElement('a');
    a.href = m.url;
    a.download = m.title || m.s3Key?.split('/').pop() || 'asset';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('⚡ Initiating asset download...');
  };

  const updateMediaMeta = async (id, data) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        if (inspectorMedia) setInspectorMedia(updated);
        showToast('Media details updated successfully');
        if (refreshData) refreshData();
      }
    } catch (err) { setError(err.message); }
  };

  const moveOne = async (id, folder) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      if (res.ok) {
        setMoveTarget(null);
        showToast(`Moved to folder "${folder}"`);
        if (refreshData) refreshData();
      }
    } catch (err) { console.error(err); }
  };

  const bulkFavorite = async (fav) => {
    try {
      await fetch('/api/media/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedMedia), action: 'set', favorite: fav }),
      });
      setSelectedMedia(new Set());
      showToast(fav ? `Starred ${selectedMedia.size} items` : `Unstarred ${selectedMedia.size} items`);
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedMedia.size} selected items permanently?`)) return;
    try {
      for (const id of Array.from(selectedMedia)) {
        await fetch(`/api/media/${id}`, { method: 'DELETE' });
      }
      showToast(`Deleted ${selectedMedia.size} assets`);
      setSelectedMedia(new Set());
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const bulkMove = async (folder) => {
    try {
      await fetch('/api/media/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedMedia), action: 'move', folder }),
      });
      showToast(`Moved ${selectedMedia.size} items to ${folder}`);
      setSelectedMedia(new Set());
      setMoveTarget(null);
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const bulkDownload = () => {
    const selectedItems = list.filter(m => selectedMedia.has(m._id || m.id));
    if (selectedItems.length === 0) return;
    selectedItems.forEach((m, idx) => {
      setTimeout(() => downloadAsset(m), idx * 250);
    });
    showToast(`Downloading ${selectedItems.length} items...`);
  };

  // ── Upload Handlers ────────────────────────────────────────
  const handleMediaFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const removeFromQueue = (id) => {
    setUploadQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const performUpload = async () => {
    if (uploadQueue.length === 0) return;
    setMediaUploading(true);
    setError('');

    const parsedTags = mediaUploadTags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);

    for (const item of uploadQueue) {
      if (item.status === 'done') continue;
      setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'uploading' } : i));

      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('folder', mediaEventTag);
      fd.append('tags', JSON.stringify(parsedTags));
      if (mediaUploadTitle.trim()) fd.append('title', mediaUploadTitle.trim());
      if (mediaUploadDesc.trim()) fd.append('description', mediaUploadDesc.trim());
      if (mediaUploadFavorite) fd.append('favorite', 'true');

      try {
        const res = await fetch('/api/media', { method: 'POST', body: fd });
        if (res.ok) {
          setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done' } : i));
        } else {
          const d = await res.json();
          setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'error', error: d.error || 'Failed' } : i));
        }
      } catch (err) {
        setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
      }
    }

    setMediaUploading(false);
    showToast('Upload process completed');
    if (refreshData) refreshData();
  };

  const cancelUpload = () => {
    setShowMediaUpload(false);
    setUploadQueue([]);
    setMediaUploadTags('');
    setMediaUploadTitle('');
    setMediaUploadDesc('');
  };

  // ── Create Folder Handler ──────────────────────────────────
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setShowFolderCreateModal(false);
        setNewFolderName('');
        setMediaFilterFolder(name);
        showToast(`Folder "${name}" created`);
        if (refreshData) refreshData();
      }
    } catch (e) { console.error(e); }
    finally { setCreatingFolder(false); }
  };

  return (
    <div 
      className="admin-media-wrapper"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Global Drag Overlay */}
      {isDragging && (
        <div className="admin-media__drag-overlay">
          <div className="admin-media__drag-backdrop">
            <Upload size={48} className="admin-media__drag-icon" />
            <h3>Drop Files Here to Upload</h3>
            <p>Upload images & videos directly to "{mediaFilterFolder === 'all' ? 'General' : mediaFilterFolder}"</p>
          </div>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderKanban className="admin-media__title-icon" size={24} /> Media Gallery Studio
          </h2>
          <p className="admin-section__subtitle">
            Manage photos, videos, event assets & CDN storage for KLFORGE
          </p>
        </div>
        <div className="admin-dash__filters" style={{ marginTop: 0 }}>
          <button className="admin-dash__save-btn" onClick={() => setShowMediaUpload(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> Upload Media
          </button>
        </div>
      </div>

      {/* Media Stats Overview Grid */}
      <div className="admin-media__stats-grid">
        <div className="admin-media__stat-card">
          <div className="admin-media__stat-icon admin-media__stat-icon--primary"><HardDrive size={18} /></div>
          <div>
            <div className="admin-media__stat-value">{formatBytes(totalSizeBytes)}</div>
            <div className="admin-media__stat-label">Total Storage Used</div>
          </div>
        </div>

        <div className="admin-media__stat-card">
          <div className="admin-media__stat-icon admin-media__stat-icon--info"><ImageIcon size={18} /></div>
          <div>
            <div className="admin-media__stat-value">{imageCount}</div>
            <div className="admin-media__stat-label">Photo Assets</div>
          </div>
        </div>

        <div className="admin-media__stat-card">
          <div className="admin-media__stat-icon admin-media__stat-icon--purple"><Video size={18} /></div>
          <div>
            <div className="admin-media__stat-value">{videoCount}</div>
            <div className="admin-media__stat-label">Video Assets</div>
          </div>
        </div>

        <div className="admin-media__stat-card">
          <div className="admin-media__stat-icon admin-media__stat-icon--amber"><Star size={18} /></div>
          <div>
            <div className="admin-media__stat-value">{favCount}</div>
            <div className="admin-media__stat-label">Favorited Highlights</div>
          </div>
        </div>
      </div>

      {/* Main Toolbar & Search */}
      <div className="admin-media__toolbar">
        <div className="admin-media__toolbar-left">
          <div className="admin-media__search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search title, tags, folder or file..."
            />
            {mediaSearch && (
              <button type="button" className="admin-media__search-clear" onClick={() => setMediaSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={mediaFilterType}
            onChange={(e) => setMediaFilterType(e.target.value)}
            className="admin-dash__select"
          >
            <option value="all">All Asset Types</option>
            <option value="image">📷 Photos / Images</option>
            <option value="video">🎥 Videos</option>
          </select>

          <select
            value={mediaSort}
            onChange={(e) => setMediaSort(e.target.value)}
            className="admin-dash__select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>

          <label className={`admin-media__fav-toggle ${mediaOnlyFavorites ? 'admin-media__fav-toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={mediaOnlyFavorites}
              onChange={(e) => setMediaOnlyFavorites(e.target.checked)}
            />
            <Star size={14} fill={mediaOnlyFavorites ? '#ffd86b' : 'none'} color={mediaOnlyFavorites ? '#ffd86b' : 'currentColor'} />
            Starred Only
          </label>
        </div>

        <div className="admin-media__toolbar-right">
          <div className="admin-media__view-switch">
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'grid' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('grid')}
              title="Grid View"
            >
              <Grid3x3 size={15} />
            </button>
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'list' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('list')}
              title="Spreadsheet List View"
            >
              <Rows3 size={15} />
            </button>
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'masonry' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('masonry')}
              title="Masonry Gallery"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button 
            className="admin-media__bulk-btn" 
            onClick={selectAllVisible} 
            disabled={list.length === 0}
          >
            {selectedMedia.size === list.length && list.length > 0 ? (
              <><Square size={13} /> Deselect All</>
            ) : (
              <><CheckSquare size={13} /> Select All ({list.length})</>
            )}
          </button>
        </div>
      </div>

      {/* Folders Bar */}
      <div className="admin-media__folders-bar">
        <div className="admin-media__folders-scroll">
          <button
            className={`admin-media__folder-chip ${mediaFilterFolder === 'all' ? 'admin-media__folder-chip--active' : ''}`}
            onClick={() => setMediaFilterFolder('all')}
          >
            <FolderKanban size={13} /> All Folders <span className="admin-media__chip-count">{media.length}</span>
          </button>

          {allFolders.map((f) => (
            <button
              key={f}
              className={`admin-media__folder-chip ${mediaFilterFolder === f ? 'admin-media__folder-chip--active' : ''}`}
              onClick={() => setMediaFilterFolder(f)}
            >
              <Folder size={13} /> {f} {folderCounts[f] ? <span className="admin-media__chip-count">{folderCounts[f]}</span> : null}
            </button>
          ))}
        </div>

        <button
          className="admin-media__folder-chip admin-media__folder-chip--create"
          onClick={() => { setNewFolderName(''); setShowFolderCreateModal(true); }}
        >
          <Plus size={13} /> New Folder
        </button>
      </div>

      {/* Tags Chips Bar */}
      {allTags.length > 0 && (
        <div className="admin-media__tags-row">
          <span className="admin-media__tags-label"><Tag size={11} /> Tags Filter:</span>
          <div className="admin-media__tags-chips">
            <button
              className={`admin-media__tag-chip ${selectedTag === 'all' ? 'admin-media__tag-chip--active' : ''}`}
              onClick={() => setSelectedTag('all')}
            >
              All Tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                className={`admin-media__tag-chip ${selectedTag.toLowerCase() === t.toLowerCase() ? 'admin-media__tag-chip--active' : ''}`}
                onClick={() => setSelectedTag(selectedTag.toLowerCase() === t.toLowerCase() ? 'all' : t)}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedMedia.size > 0 && (
        <div className="admin-media__bulkbar">
          <div className="admin-media__bulkbar-left">
            <span className="admin-media__bulkbar-badge">{selectedMedia.size}</span>
            <span className="admin-media__bulkbar-count">asset{selectedMedia.size !== 1 ? 's' : ''} selected</span>
          </div>

          <div className="admin-media__bulkbar-actions">
            <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(true)} title="Favorite selected">
              <Star size={13} /> Favorite
            </button>
            <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(false)} title="Unfavorite selected">
              <Star size={13} /> Unstar
            </button>
            <button className="admin-media__bulkbar-btn" onClick={() => setMoveTarget({ ids: Array.from(selectedMedia), current: null })}>
              <FolderInput size={13} /> Move to...
            </button>
            <button className="admin-media__bulkbar-btn" onClick={bulkDownload} title="Download selected assets">
              <Download size={13} /> Download
            </button>
            <button className="admin-media__bulkbar-btn admin-media__bulkbar-btn--danger" onClick={bulkDelete}>
              <Trash2 size={13} /> Delete
            </button>
            <button className="admin-media__bulkbar-btn" onClick={() => setSelectedMedia(new Set())}>
              <X size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && <div className="admin-media__toast">{toastMsg}</div>}

      {/* Main Gallery Display */}
      {list.length === 0 ? (
        <div className="admin-dash__empty" style={{ padding: '60px 20px', textTransform: 'none' }}>
          <FolderKanban size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>No Assets Found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', maxWidth: 400 }}>
            {mediaSearch.trim()
              ? `No media matches your search term "${mediaSearch}".`
              : 'There are no media items in this folder yet. Drag and drop files here or click "Upload Media" above.'}
          </p>
        </div>
      ) : mediaLayout === 'list' ? (
        /* Detailed List / Table Layout */
        <div className="admin-dash__table-wrap" style={{ marginTop: 16 }}>
          <table className="admin-dash__table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedMedia.size === list.length && list.length > 0}
                    onChange={selectAllVisible}
                  />
                </th>
                <th style={{ width: 64 }}>Preview</th>
                <th>Asset Title & Details</th>
                <th>Folder</th>
                <th>Format</th>
                <th>File Size</th>
                <th>Upload Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const mid = m._id || m.id;
                const selected = selectedMedia.has(mid);
                const isVideo = m.type === 'video' || String(m.url).match(/\.(mp4|webm|mov|mkv)/i);

                return (
                  <tr key={mid} className={selected ? 'admin-media__row--selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(mid)}
                      />
                    </td>
                    <td>
                      <div className="admin-media__list-thumb" onClick={() => setInspectorMedia(m)}>
                        {isVideo ? (
                          <video src={m.url} muted />
                        ) : (
                          <img src={m.url} alt={m.title || m.folder} loading="lazy" />
                        )}
                        {m.favorite && <span className="admin-media__fav-badge"><Star size={8} /></span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                        {m.title || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Untitled Asset</span>}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                          {m.description.slice(0, 70)}{m.description.length > 70 ? '...' : ''}
                        </div>
                      )}
                      {Array.isArray(m.tags) && m.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {m.tags.map(t => (
                            <span key={t} style={{ background: 'rgba(113,196,255,0.1)', color: '#71C4FF', fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4 }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="admin-rec-year-badge">{m.folder || m.eventName || 'General'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: isVideo ? '#c084fc' : '#71C4FF', fontWeight: 600 }}>
                        {isVideo ? '🎥 Video' : '📷 Image'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                      {formatBytes(m.fileSize)}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="admin-dash__title-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="admin-dash__icon-btn" title="Inspect & Edit" onClick={() => setInspectorMedia(m)}>
                          <Eye size={14} />
                        </button>
                        <button className="admin-dash__icon-btn" title="Download" onClick={() => downloadAsset(m)}>
                          <Download size={14} />
                        </button>
                        <button className="admin-dash__icon-btn" title="Copy Link" onClick={() => copyShareLink(m)}>
                          <Share2 size={14} />
                        </button>
                        <button 
                          className={`admin-dash__icon-btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`} 
                          title="Favorite" 
                          onClick={() => toggleFavorite(m)}
                        >
                          <Star size={14} fill={m.favorite ? '#ffd86b' : 'none'} color={m.favorite ? '#ffd86b' : 'currentColor'} />
                        </button>
                        <button className="admin-dash__icon-btn" title="Move folder" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })}>
                          <FolderInput size={14} />
                        </button>
                        <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" title="Delete" onClick={() => setMediaDeleteConfirm(mid)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid & Masonry Visual Layouts */
        <div className={`admin-media__grid admin-media__grid--${mediaLayout}`}>
          {list.map((m) => {
            const mid = m._id || m.id;
            const selected = selectedMedia.has(mid);
            const isVideo = m.type === 'video' || String(m.url).match(/\.(mp4|webm|mov|mkv)/i);

            return (
              <div 
                key={mid} 
                className={`admin-media__card ${selected ? 'admin-media__card--selected' : ''}`}
              >
                <div className="admin-media__preview" onClick={() => setInspectorMedia(m)}>
                  {isVideo ? (
                    <div className="admin-media__video-wrap">
                      <video src={m.url} className="admin-media__asset" muted preload="metadata" />
                      <div className="admin-media__video-badge"><Video size={12} /> Video</div>
                    </div>
                  ) : (
                    <img src={m.url} alt={m.title || m.folder || 'media'} className="admin-media__asset" loading="lazy" />
                  )}

                  {/* Hover Overlay Action Bar */}
                  <div className="admin-media__hover" onClick={(e) => e.stopPropagation()}>
                    <button className="admin-media__btn" title="Inspect & Edit Details" onClick={() => setInspectorMedia(m)}><Eye size={15} /></button>
                    <button className="admin-media__btn" title="Download Asset" onClick={() => downloadAsset(m)}><Download size={15} /></button>
                    <button className="admin-media__btn" title="Copy Direct URL" onClick={() => copyShareLink(m)}><Share2 size={15} /></button>
                    <button className="admin-media__btn" title="Move to Folder" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })}><FolderInput size={15} /></button>
                    <button className={`admin-media__btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`} title="Favorite" onClick={() => toggleFavorite(m)}>
                      <Star size={15} fill={m.favorite ? '#ffd86b' : 'none'} color={m.favorite ? '#ffd86b' : 'currentColor'} />
                    </button>
                    <button className="admin-media__btn admin-media__btn--danger" title="Delete Asset" onClick={() => setMediaDeleteConfirm(mid)}><Trash2 size={15} /></button>
                  </div>

                  {/* Top Badges */}
                  <div className="admin-media__card-badges">
                    {m.favorite && <span className="admin-media__fav-pill"><Star size={10} fill="#ffd86b" /></span>}
                    {m.fileSize ? <span className="admin-media__size-badge">{formatBytes(m.fileSize)}</span> : null}
                  </div>
                </div>

                <div className="admin-media__info">
                  <label className="admin-media__select" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSelect(mid)} />
                    <span className="admin-media__card-title">{m.title || <span style={{ opacity: 0.4 }}>Untitled Asset</span>}</span>
                  </label>
                  <span className="admin-media__tag">{m.folder || m.eventName || 'General'}</span>
                </div>

                {/* Inline Delete Confirmation Overlay */}
                {mediaDeleteConfirm === mid && (
                  <div className="admin-media__confirm">
                    <p>Delete asset permanently?</p>
                    <div className="admin-media__confirm-actions">
                      <button className="admin-media__confirm-btn admin-media__confirm-btn--danger" onClick={() => handleMediaDelete(mid)}>Delete</button>
                      <button className="admin-media__confirm-btn" onClick={() => setMediaDeleteConfirm(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Folder Modal ────────────────────────────── */}
      {showFolderCreateModal && (
        <div className="admin-dash__overlay" onClick={() => setShowFolderCreateModal(false)}>
          <div className="admin-dash__modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Create New Media Folder</h2>
              <button className="admin-dash__close-btn" onClick={() => setShowFolderCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateFolderSubmit} className="admin-dash__modal-form">
              <div className="admin-dash__modal-body">
                <div className="admin-dash__field">
                  <label>Folder Name *</label>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Hackathon 2026, Certificates"
                    className="admin-dash__input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowFolderCreateModal(false)}>Cancel</button>
                <button type="submit" className="admin-dash__save-btn" disabled={creatingFolder || !newFolderName.trim()}>
                  {creatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Move Target Modal ──────────────────────────────── */}
      {moveTarget && (
        <div className="admin-dash__overlay" onClick={() => setMoveTarget(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Move Asset{moveTarget.ids.length !== 1 ? 's' : ''} to Folder</h2>
              <button className="admin-dash__close-btn" onClick={() => setMoveTarget(null)}><X size={20} /></button>
            </div>
            <div className="admin-dash__modal-body">
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Select target folder for {moveTarget.ids.length} selected asset{moveTarget.ids.length !== 1 ? 's' : ''}:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {allFolders.map(f => (
                  <button
                    key={f}
                    type="button"
                    className="admin-media__folder-chip"
                    style={{ justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10 }}
                    onClick={() => {
                      if (moveTarget.ids.length === 1) moveOne(moveTarget.ids[0], f);
                      else bulkMove(f);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Folder size={14} /> {f}
                    </span>
                    <span className="admin-media__chip-count">{folderCounts[f] || 0} assets</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Queue Modal ─────────────────────────────── */}
      {showMediaUpload && (
        <div className="admin-dash__overlay" onClick={cancelUpload}>
          <div className="admin-dash__modal" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <div>
                <h2>Upload Media Assets</h2>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                  {uploadQueue.length === 0 ? 'Pick files or drag & drop onto the zone' : `${uploadQueue.length} asset${uploadQueue.length !== 1 ? 's' : ''} in queue`}
                </p>
              </div>
              <button className="admin-dash__close-btn" onClick={cancelUpload}><X size={20} /></button>
            </div>

            <div className="admin-dash__modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
                {/* Left File Queue Picker */}
                <div>
                  <div className="admin-upload-modal__pick-zone" style={{ border: '2px dashed rgba(113,196,255,0.25)', padding: 24, borderRadius: 14, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <input type="file" id="media-upload-input" style={{ display: 'none' }} accept="image/*,video/*" multiple onChange={handleMediaFilePick} />
                    <label htmlFor="media-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Upload size={28} style={{ color: '#71C4FF' }} />
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Choose Files or Drag Here</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Supports JPG, PNG, WEBP, GIF, MP4, WEBM up to 100MB</span>
                    </label>
                  </div>

                  {uploadQueue.length > 0 && (
                    <div style={{ marginTop: 14, maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                      {uploadQueue.map((item) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                          {item.preview ? (
                            <img src={item.preview} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                          ) : (
                            <div style={{ width: 36, height: 36, background: 'rgba(192,132,252,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#c084fc' }}>
                              <Video size={16} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{formatBytes(item.file.size)}</div>
                          </div>
                          {item.status === 'uploading' && <span style={{ fontSize: '0.72rem', color: '#71C4FF' }}>Uploading...</span>}
                          {item.status === 'done' && <CheckCircle size={16} style={{ color: '#4caf81' }} />}
                          {item.status !== 'uploading' && item.status !== 'done' && (
                            <button type="button" className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => removeFromQueue(item.id)}><X size={14} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Folder & Tags Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="admin-dash__field">
                    <label>Target Folder</label>
                    <select value={mediaEventTag} onChange={(e) => setMediaEventTag(e.target.value)} className="admin-dash__input">
                      {allFolders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div className="admin-dash__field">
                    <label>Asset Title (Optional)</label>
                    <input type="text" value={mediaUploadTitle} onChange={(e) => setMediaUploadTitle(e.target.value)} placeholder="Title for items..." className="admin-dash__input" />
                  </div>

                  <div className="admin-dash__field">
                    <label>Tags (Comma-separated)</label>
                    <input type="text" value={mediaUploadTags} onChange={(e) => setMediaUploadTags(e.target.value)} placeholder="hackathon, 2026, team" className="admin-dash__input" />
                  </div>

                  <div className="admin-dash__field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={mediaUploadFavorite} onChange={(e) => setMediaUploadFavorite(e.target.checked)} />
                      Mark as Starred Highlight
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={cancelUpload}>Cancel</button>
              <button type="button" className="admin-dash__save-btn" onClick={performUpload} disabled={mediaUploading || uploadQueue.length === 0}>
                {mediaUploading ? 'Uploading Assets…' : `Start Upload (${uploadQueue.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Asset Lightbox & Inspector Drawer ──────────────── */}
      {inspectorMedia && (
        <div className="admin-dash__overlay" onClick={() => setInspectorMedia(null)}>
          <div className="admin-media__inspector-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-media__inspector-close" onClick={() => setInspectorMedia(null)}>
              <X size={20} />
            </button>

            {/* Left Preview Panel */}
            <div className="admin-media__inspector-preview">
              {inspectorMedia.type === 'video' || String(inspectorMedia.url).match(/\.(mp4|webm|mov|mkv)/i) ? (
                <video src={inspectorMedia.url} controls autoPlay className="admin-media__inspector-asset" />
              ) : (
                <img src={inspectorMedia.url} alt={inspectorMedia.title || ''} className="admin-media__inspector-asset" />
              )}
            </div>

            {/* Right Details Panel */}
            <div className="admin-media__inspector-sidebar">
              <div className="admin-media__inspector-head">
                <h3 className="admin-media__inspector-title">
                  {inspectorMedia.title || <span style={{ opacity: 0.4 }}>Untitled Asset</span>}
                </h3>
                <span className="admin-rec-year-badge">{inspectorMedia.folder || inspectorMedia.eventName || 'General'}</span>
              </div>

              {/* Asset Specs Table */}
              <div className="admin-media__inspector-specs">
                <div className="admin-media__spec-item">
                  <span className="admin-media__spec-label">Format</span>
                  <span className="admin-media__spec-val">{inspectorMedia.type || 'Asset'}</span>
                </div>
                <div className="admin-media__spec-item">
                  <span className="admin-media__spec-label">File Size</span>
                  <span className="admin-media__spec-val">{formatBytes(inspectorMedia.fileSize)}</span>
                </div>
                <div className="admin-media__spec-item">
                  <span className="admin-media__spec-label">Uploaded</span>
                  <span className="admin-media__spec-val">{inspectorMedia.createdAt ? new Date(inspectorMedia.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              {/* Title & Description Editor */}
              <div className="admin-dash__field" style={{ marginTop: 14 }}>
                <label>Title</label>
                <input
                  type="text"
                  value={inspectorMedia.title || ''}
                  onChange={(e) => setInspectorMedia({ ...inspectorMedia, title: e.target.value })}
                  onBlur={() => updateMediaMeta(inspectorMedia._id || inspectorMedia.id, { title: inspectorMedia.title })}
                  className="admin-dash__input"
                  placeholder="Asset title..."
                />
              </div>

              <div className="admin-dash__field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={inspectorMedia.description || ''}
                  onChange={(e) => setInspectorMedia({ ...inspectorMedia, description: e.target.value })}
                  onBlur={() => updateMediaMeta(inspectorMedia._id || inspectorMedia.id, { description: inspectorMedia.description })}
                  className="admin-dash__input"
                  placeholder="Asset description..."
                />
              </div>

              <div className="admin-dash__field">
                <label>Folder Location</label>
                <select
                  value={inspectorMedia.folder || inspectorMedia.eventName || 'General'}
                  onChange={(e) => {
                    const newF = e.target.value;
                    setInspectorMedia({ ...inspectorMedia, folder: newF });
                    updateMediaMeta(inspectorMedia._id || inspectorMedia.id, { folder: newF });
                  }}
                  className="admin-dash__input"
                >
                  {allFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="admin-media__inspector-actions">
                <button className="admin-dash__save-btn" onClick={() => downloadAsset(inspectorMedia)} style={{ flex: 1, justifyContent: 'center' }}>
                  <Download size={14} /> Download Asset
                </button>
                <button className="admin-dash__cancel-btn" onClick={() => copyShareLink(inspectorMedia)}>
                  <Share2 size={14} /> Copy Link
                </button>
                <button 
                  className={`admin-dash__cancel-btn ${inspectorMedia.favorite ? 'admin-media__btn--fav-active' : ''}`}
                  onClick={() => toggleFavorite(inspectorMedia)}
                >
                  <Star size={14} fill={inspectorMedia.favorite ? '#ffd86b' : 'none'} color={inspectorMedia.favorite ? '#ffd86b' : 'currentColor'} />
                </button>
                <button 
                  className="admin-dash__cancel-btn" 
                  style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}
                  onClick={() => handleMediaDelete(inspectorMedia._id || inspectorMedia.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
