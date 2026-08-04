'use client';

import React, { useState } from 'react';
import { 
  Upload, Search, Grid3x3, Rows3, LayoutGrid, Star, Trash2, FolderInput, 
  Share2, Eye, X, Plus, Tag, FolderKanban, CheckCircle, Video, Edit3, Download 
} from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

export default function MediaSection({
  media = [],
  events = [],
  mediaFolders = [],
  refreshData
}) {
  const [mediaFilterTag, setMediaFilterTag] = useState('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaOnlyFavorites, setMediaOnlyFavorites] = useState(false);
  const [mediaSort, setMediaSort] = useState('newest');
  const [mediaLayout, setMediaLayout] = useState('grid');
  const [selectedMedia, setSelectedMedia] = useState(new Set());
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [mediaDeleteConfirm, setMediaDeleteConfirm] = useState(null);
  const [editingMediaMeta, setEditingMediaMeta] = useState(null);

  // Folder creation
  const [showFolderCreateModal, setShowFolderCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload modal state
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [mediaEventTag, setMediaEventTag] = useState('General');
  const [mediaUploadTags, setMediaUploadTags] = useState('');
  const [mediaUploadTitle, setMediaUploadTitle] = useState('');
  const [mediaUploadDesc, setMediaUploadDesc] = useState('');
  const [mediaUploadFavorite, setMediaUploadFavorite] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [error, setError] = useState('');

  const folders = Array.from(new Set([
    'General',
    ...mediaFolders.map((f) => f.name || f).filter(Boolean),
    ...media.map((m) => m.folder || m.eventName || 'General'),
  ]));

  let list = media.slice();
  if (mediaFilterTag !== 'all') {
    list = list.filter((m) => (m.folder || m.eventName) === mediaFilterTag);
  }
  if (mediaOnlyFavorites) list = list.filter((m) => m.favorite);
  if (mediaSearch.trim()) {
    const q = mediaSearch.trim().toLowerCase();
    list = list.filter((m) =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.folder || m.eventName || '').toLowerCase().includes(q) ||
      (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  list.sort((a, b) => {
    if (mediaSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (mediaSort === 'name') return (a.title || a.folder || '').localeCompare(b.title || b.folder || '');
    if (mediaSort === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const toggleSelect = (id) => {
    const next = new Set(selectedMedia);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMedia(next);
  };

  const selectAllVisible = () => {
    if (selectedMedia.size === list.length) setSelectedMedia(new Set());
    else setSelectedMedia(new Set(list.map((m) => m._id || m.id)));
  };

  const toggleFavorite = async (m) => {
    const id = m._id || m.id;
    try {
      await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !m.favorite }),
      });
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const handleMediaDelete = async (id) => {
    try {
      await fetch(`/api/media/${id}`, { method: 'DELETE' });
      setMediaDeleteConfirm(null);
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const copyShareLink = (m) => {
    navigator.clipboard.writeText(m.url);
    setShareToast('Link copied to clipboard!');
    setTimeout(() => setShareToast(''), 2500);
  };

  const updateMediaMeta = async (id, data) => {
    try {
      await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setEditingMediaMeta(null);
      if (refreshData) refreshData();
    } catch (err) { setError(err.message); }
  };

  const moveOne = async (id, folder) => {
    try {
      await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      setMoveTarget(null);
      if (refreshData) refreshData();
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
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedMedia.size} selected items?`)) return;
    try {
      for (const id of Array.from(selectedMedia)) {
        await fetch(`/api/media/${id}`, { method: 'DELETE' });
      }
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
      setSelectedMedia(new Set());
      setMoveTarget(null);
      if (refreshData) refreshData();
    } catch (err) { console.error(err); }
  };

  // Upload Queue Handlers
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
    if (refreshData) refreshData();
  };

  const cancelUpload = () => {
    setShowMediaUpload(false);
    setUploadQueue([]);
    setMediaUploadTags('');
    setMediaUploadTitle('');
    setMediaUploadDesc('');
  };

  const allTags = Array.from(new Set(media.flatMap((m) => Array.isArray(m.tags) ? m.tags : []))).sort();

  return (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title">Media Gallery</h2>
          <p className="admin-section__subtitle">
            {media.length} asset{media.length !== 1 ? 's' : ''} &middot; {media.filter((m) => m.favorite).length} favorited
          </p>
        </div>
        <div className="admin-dash__filters" style={{ marginTop: 0 }}>
          <button className="admin-dash__add-btn" onClick={() => setShowMediaUpload(true)}>
            <Upload size={18} /> Upload
          </button>
        </div>
      </div>

      <div className="admin-media__toolbar">
        <div className="admin-media__toolbar-left">
          <div className="admin-media__search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search title, description, folder or #tag…"
            />
          </div>
          <select
            value={mediaSort}
            onChange={(e) => setMediaSort(e.target.value)}
            className="admin-dash__select"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">By name</option>
            <option value="size">By size</option>
          </select>
          <label className="admin-media__fav-toggle">
            <input
              type="checkbox"
              checked={mediaOnlyFavorites}
              onChange={(e) => setMediaOnlyFavorites(e.target.checked)}
            />
            <Star size={14} aria-hidden="true" />
            Favorites only
          </label>
        </div>

        <div className="admin-media__toolbar-right">
          <div className="admin-media__view-switch">
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'grid' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('grid')}
              title="Grid"
            >
              <Grid3x3 size={14} />
            </button>
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'list' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('list')}
              title="List"
            >
              <Rows3 size={14} />
            </button>
            <button
              type="button"
              className={`admin-media__view-btn ${mediaLayout === 'masonry' ? 'admin-media__view-btn--active' : ''}`}
              onClick={() => setMediaLayout('masonry')}
              title="Masonry"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <button className="admin-media__bulk-btn" onClick={selectAllVisible} disabled={list.length === 0}>
            {selectedMedia.size === list.length && list.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>

      {/* Folders chip row */}
      <div className="admin-media__folders">
        <button
          className={`admin-media__folder-chip ${mediaFilterTag === 'all' ? 'admin-media__folder-chip--active' : ''}`}
          onClick={() => setMediaFilterTag('all')}
        >
          <FolderKanban size={12} /> All
        </button>
        {folders.map((f) => (
          <button
            key={f}
            className={`admin-media__folder-chip ${mediaFilterTag === f ? 'admin-media__folder-chip--active' : ''}`}
            onClick={() => setMediaFilterTag(f)}
          >
            {f}
          </button>
        ))}
        <button
          className="admin-media__folder-chip"
          style={{ borderStyle: 'dashed', background: 'transparent' }}
          onClick={() => { setNewFolderName(''); setShowFolderCreateModal(true); }}
        >
          <Plus size={12} /> New Folder
        </button>
      </div>

      {/* Tags chip row */}
      {allTags.length > 0 && (
        <div className="admin-media__tags-row">
          <span className="admin-media__tags-label"><Tag size={11} /> Tags</span>
          <div className="admin-media__tags-chips">
            {allTags.map((t) => (
              <button
                key={t}
                className={`admin-media__tag-chip ${mediaSearch.trim().toLowerCase() === t.toLowerCase() ? 'admin-media__tag-chip--active' : ''}`}
                onClick={() => setMediaSearch(mediaSearch === t ? '' : t)}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedMedia.size > 0 && (
        <div className="admin-media__bulkbar">
          <span className="admin-media__bulkbar-count">{selectedMedia.size} selected</span>
          <div className="admin-media__bulkbar-actions">
            <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(true)}><Star size={14} /> Favorite</button>
            <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(false)}><Star size={14} /> Unfavorite</button>
            <button className="admin-media__bulkbar-btn" onClick={() => setMoveTarget({ ids: Array.from(selectedMedia), current: null })}><FolderInput size={14} /> Move to</button>
            <button className="admin-media__bulkbar-btn admin-media__bulkbar-btn--danger" onClick={bulkDelete}><Trash2 size={14} /> Delete</button>
            <button className="admin-media__bulkbar-btn" onClick={() => setSelectedMedia(new Set())}><X size={14} /> Clear</button>
          </div>
        </div>
      )}

      {shareToast && <div className="admin-media__toast">{shareToast}</div>}

      {/* Gallery Grid / List */}
      {list.length === 0 ? (
        <div className="admin-dash__empty">
          {mediaSearch.trim() ? `No media matches "${mediaSearch}".` : 'No media in this folder yet. Click "Upload" to add some.'}
        </div>
      ) : mediaLayout === 'list' ? (
        <div className="admin-media__list">
          <div className="admin-media__list-head">
            <span className="admin-media__list-th admin-media__list-th--check">Select</span>
            <span className="admin-media__list-th">Preview</span>
            <span className="admin-media__list-th">Title</span>
            <span className="admin-media__list-th">Folder</span>
            <span className="admin-media__list-th">Type</span>
            <span className="admin-media__list-th admin-media__list-th--num">Size</span>
            <span className="admin-media__list-th">Date</span>
            <span className="admin-media__list-th">Actions</span>
          </div>
          {list.map((m) => {
            const mid = m._id || m.id;
            const selected = selectedMedia.has(mid);
            return (
              <div key={mid} className={`admin-media__row ${selected ? 'admin-media__row--selected' : ''}`}>
                <label className="admin-media__row-check" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected} onChange={() => toggleSelect(mid)} />
                </label>
                <button type="button" className="admin-media__row-thumb" onClick={() => setLightboxMedia(m)}>
                  {m.type === 'video' ? <video src={m.url} muted /> : <img src={m.url} alt={m.title || m.folder} loading="lazy" />}
                  {m.favorite && <span className="admin-media__fav-pill"><Star size={9} /></span>}
                </button>
                <div className="admin-media__row-title">{m.title || <span className="muted">Untitled</span>}</div>
                <div className="admin-media__row-folder"><span className="admin-media__tag">{m.folder || m.eventName || 'General'}</span></div>
                <div className="admin-media__row-type">{m.type}</div>
                <div className="admin-media__row-num">{m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(1)} MB` : '—'}</div>
                <div className="admin-media__row-date">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</div>
                <div className="admin-media__row-actions">
                  <button className="admin-media__btn" onClick={() => setEditingMediaMeta({ id: mid, title: m.title || '', description: m.description || '' })}><Edit3 size={14} /></button>
                  <button className="admin-media__btn" onClick={() => copyShareLink(m)}><Share2 size={14} /></button>
                  <button className={`admin-media__btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`} onClick={() => toggleFavorite(m)}><Star size={14} fill={m.favorite ? '#ffd86b' : 'none'} /></button>
                  <button className="admin-media__btn" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })}><FolderInput size={14} /></button>
                  <button className="admin-media__btn admin-media__btn--danger" onClick={() => setMediaDeleteConfirm(mid)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`admin-media__grid admin-media__grid--${mediaLayout}`}>
          {list.map((m) => {
            const mid = m._id || m.id;
            const selected = selectedMedia.has(mid);
            return (
              <div key={mid} className={`admin-media__card ${selected ? 'admin-media__card--selected' : ''}`}>
                <div className="admin-media__preview" onClick={() => setLightboxMedia(m)}>
                  {m.type === 'video' ? <video src={m.url} className="admin-media__asset" muted /> : <img src={m.url} alt={m.title || m.folder || 'media'} className="admin-media__asset" loading="lazy" />}
                  <div className="admin-media__hover" onClick={(e) => e.stopPropagation()}>
                    <button className="admin-media__btn" onClick={() => setLightboxMedia(m)}><Eye size={16} /></button>
                    <button className="admin-media__btn" onClick={() => setEditingMediaMeta({ id: mid, title: m.title || '', description: m.description || '' })}><Edit3 size={16} /></button>
                    <button className="admin-media__btn" onClick={() => copyShareLink(m)}><Share2 size={16} /></button>
                    <button className="admin-media__btn" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })}><FolderInput size={16} /></button>
                    <button className={`admin-media__btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`} onClick={() => toggleFavorite(m)}><Star size={16} fill={m.favorite ? '#ffd86b' : 'none'} /></button>
                    <button className="admin-media__btn admin-media__btn--danger" onClick={() => setMediaDeleteConfirm(mid)}><Trash2 size={16} /></button>
                  </div>
                  {m.favorite && <span className="admin-media__fav-pill"><Star size={10} /> Fav</span>}
                </div>
                <div className="admin-media__info">
                  <label className="admin-media__select" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSelect(mid)} />
                    <span>Select</span>
                  </label>
                  <span className="admin-media__tag">{m.folder || m.eventName || 'General'}</span>
                  <span className="admin-media__meta">
                    {m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'}
                  </span>
                </div>

                {mediaDeleteConfirm === mid && (
                  <div className="admin-media__confirm">
                    <p>Delete this asset?</p>
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

      {/* Create Folder Modal */}
      {showFolderCreateModal && (
        <div className="admin-dash__overlay">
          <div className="admin-dash__modal" style={{ maxWidth: '400px' }}>
            <div className="admin-dash__modal-header">
              <h2>Create Folder</h2>
              <button className="admin-dash__close-btn" onClick={() => setShowFolderCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const name = newFolderName.trim();
              if (!name) return;
              try {
                const res = await fetch('/api/media/folders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  setShowFolderCreateModal(false);
                  setMediaFilterTag(name);
                  if (refreshData) refreshData();
                }
              } catch (e) { console.error(e); }
            }}>
              <div className="admin-dash__modal-body">
                <div className="admin-dash__field">
                  <label>Folder Name</label>
                  <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. Bootcamp 2026" className="admin-dash__input" autoFocus />
                </div>
                <div className="admin-dash__modal-actions">
                  <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowFolderCreateModal(false)}>Cancel</button>
                  <button type="submit" className="admin-dash__save-btn" disabled={!newFolderName.trim()}>Create</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queue Upload Modal */}
      {showMediaUpload && (
        <div className="admin-dash__overlay">
          <div className="admin-upload-modal">
            <div className="admin-upload-modal__header">
              <div>
                <h2>Upload Media</h2>
                <p className="admin-upload-modal__subtitle">
                  {uploadQueue.length === 0 ? 'Select files to get started' : `${uploadQueue.length} file${uploadQueue.length !== 1 ? 's' : ''} queued`}
                </p>
              </div>
              <button className="admin-dash__close-btn" onClick={cancelUpload}><X size={20} /></button>
            </div>

            <div className="admin-upload-modal__body">
              <div className="admin-upload-modal__left">
                <div className="admin-upload-modal__pick-zone">
                  <input type="file" id="media-upload" className="admin-dash__file-input" accept="image/*,video/*" multiple onChange={handleMediaFilePick} />
                  {uploadQueue.length === 0 && (
                    <div className="admin-upload-modal__drop-hint">
                      <Upload size={28} />
                      <span>Click "Choose Files" to pick images or videos</span>
                    </div>
                  )}
                </div>

                {uploadQueue.length > 0 && (
                  <div className="admin-upload-queue admin-upload-queue--tall">
                    {uploadQueue.map((item) => (
                      <div key={item.id} className={`admin-upload-queue__item admin-upload-queue__item--${item.status}`}>
                        {item.preview ? <img src={item.preview} alt="" className="admin-upload-queue__thumb" /> : <div className="admin-upload-queue__thumb"><Video size={18} /></div>}
                        <div className="admin-upload-queue__info">
                          <span className="admin-upload-queue__name">{item.file.name}</span>
                          <span className="admin-upload-queue__size">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                        {item.status !== 'uploading' && item.status !== 'done' && (
                          <button type="button" className="admin-upload-queue__remove" onClick={() => removeFromQueue(item.id)}><X size={14} /></button>
                        )}
                        {item.status === 'done' && <CheckCircle size={16} style={{ color: '#4caf81' }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-upload-modal__right">
                <div className="admin-dash__field">
                  <label>Folder</label>
                  <select value={mediaEventTag} onChange={(e) => setMediaEventTag(e.target.value)} className="admin-dash__input">
                    {folders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="admin-dash__field">
                  <label>Tags (comma-separated)</label>
                  <input type="text" value={mediaUploadTags} onChange={(e) => setMediaUploadTags(e.target.value)} placeholder="event, 2026, tech" />
                </div>
                <div className="admin-dash__modal-actions" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <button type="button" className="admin-dash__cancel-btn" onClick={cancelUpload}>Cancel</button>
                  <button type="button" className="admin-dash__save-btn" onClick={performUpload} disabled={mediaUploading || uploadQueue.length === 0}>
                    {mediaUploading ? 'Uploading…' : 'Start Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meta Modal */}
      {editingMediaMeta && (
        <div className="admin-dash__overlay" onClick={() => setEditingMediaMeta(null)}>
          <div className="admin-dash__modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <h2>Edit Media Details</h2>
              <button className="admin-dash__close-btn" onClick={() => setEditingMediaMeta(null)}><X size={20} /></button>
            </div>
            <div className="admin-dash__modal-body">
              <div className="admin-dash__field">
                <label>Title</label>
                <input type="text" value={editingMediaMeta.title} onChange={(e) => setEditingMediaMeta({ ...editingMediaMeta, title: e.target.value })} placeholder="Title..." />
              </div>
              <div className="admin-dash__field">
                <label>Description</label>
                <textarea rows={3} value={editingMediaMeta.description} onChange={(e) => setEditingMediaMeta({ ...editingMediaMeta, description: e.target.value })} placeholder="Description..." />
              </div>
              <div className="admin-dash__modal-actions">
                <button type="button" className="admin-dash__cancel-btn" onClick={() => setEditingMediaMeta(null)}>Cancel</button>
                <button type="button" className="admin-dash__save-btn" onClick={() => updateMediaMeta(editingMediaMeta.id, editingMediaMeta)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxMedia && (
        <div className="admin-media__lightbox" onClick={() => setLightboxMedia(null)}>
          <div className="admin-media__lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="admin-media__lightbox-close" onClick={() => setLightboxMedia(null)}><X size={20} /></button>
            <div className="admin-media__lightbox-asset">
              {lightboxMedia.type === 'video' ? <video src={lightboxMedia.url} controls autoPlay /> : <img src={lightboxMedia.url} alt="" />}
            </div>
            <aside className="admin-media__lightbox-meta">
              <h3>{lightboxMedia.title || lightboxMedia.folder || 'Untitled'}</h3>
              {lightboxMedia.description && <p>{lightboxMedia.description}</p>}
              <div className="admin-media__lightbox-actions">
                <button className="admin-media__lightbox-btn" onClick={() => copyShareLink(lightboxMedia)}><Share2 size={14} /> Copy link</button>
                <button className="admin-media__lightbox-btn admin-media__lightbox-btn--danger" onClick={() => { handleMediaDelete(lightboxMedia._id || lightboxMedia.id); setLightboxMedia(null); }}><Trash2 size={14} /> Delete</button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
