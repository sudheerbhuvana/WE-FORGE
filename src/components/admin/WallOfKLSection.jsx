'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Upload, Trash2, Edit3, Sparkles, RefreshCw, X, Check, Image as ImageIcon, Plus, ExternalLink
} from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

export default function WallOfKLSection({ adminInfo }) {
  const userPerms = Array.isArray(adminInfo?.permissions) ? adminInfo.permissions : [];
  const isElite = adminInfo?.isElite || false;

  const canUploadWallOfKL = isElite || userPerms.includes('wallofkl.upload');
  const canEditWallOfKL = isElite || userPerms.includes('wallofkl.edit_title') || userPerms.includes('wallofkl.edit_badge') || userPerms.includes('wallofkl.edit_author');
  const canDeleteWallOfKL = isElite || userPerms.includes('wallofkl.delete');

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadBadge, setUploadBadge] = useState('🏆 CONTEST WINNING CAPTURE');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadTag, setUploadTag] = useState('Official Winner');
  const [uploading, setUploading] = useState(false);

  // Edit modal state
  const [editingImage, setEditingImage] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editTag, setEditTag] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wallofkl');
      const data = await res.json();
      if (data.success) {
        setImages(data.images || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Wall of KL showcase images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!canUploadWallOfKL) return;
    if (!uploadFile) {
      setError('Please select an image file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('badge', uploadBadge);
      formData.append('author', uploadAuthor);
      formData.append('tag', uploadTag);

      const res = await fetch('/api/wallofkl', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast('Contest winner photo added to Wall of KL!');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        setUploadAuthor('');
        fetchGallery();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (img) => {
    if (!canEditWallOfKL) return;
    setEditingImage(img);
    setEditTitle(img.title || '');
    setEditBadge(img.badge || '');
    setEditAuthor(img.author || '');
    setEditTag(img.tag || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!canEditWallOfKL) return;
    if (!editingImage) return;

    try {
      setSavingEdit(true);
      const res = await fetch('/api/wallofkl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: editingImage.filename,
          title: editTitle,
          badge: editBadge,
          author: editAuthor,
          tag: editTag,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Media details updated successfully!');
        setEditingImage(null);
        fetchGallery();
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError(err.message || 'Update error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!canDeleteWallOfKL) return;
    if (!confirm('Are you sure you want to remove this capture from Wall of KL?')) return;

    try {
      const res = await fetch(`/api/wallofkl?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Image removed from Wall of KL.');
        fetchGallery();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ color: '#fff' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'rgba(34, 197, 94, 0.9)', color: '#000', fontWeight: 700,
          padding: '12px 24px', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Check size={18} /> {toastMsg}
        </div>
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy color="#fbbf24" size={24} /> Wall of KL Manager
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Upload, edit titles, badges, and winner attributions for public display on /wallofkl.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchGallery}
            className="btn btn--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 16px', borderRadius: 10, cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {canUploadWallOfKL && (
            <button
              onClick={() => setShowUploadModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f59e0b', color: '#000', fontWeight: 700, border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
            >
              <Plus size={18} /> Add Contest Photo
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: 10, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Media Showcase Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
          Loading gallery...
        </div>
      ) : images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No contest photos found on Wall of KL.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {images.map((img) => (
            <div key={img.filename} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', height: 200, background: '#000' }}>
                <img src={img.url} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.75)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, padding: '4px 8px', borderRadius: 6, backdropFilter: 'blur(4px)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  {img.badge}
                </span>
              </div>

              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>{img.title}</h4>
                  {img.author && (
                    <div style={{ fontSize: '0.8rem', color: '#71C4FF', fontWeight: 600, marginBottom: 4 }}>
                      By {img.author}
                    </div>
                  )}
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>
                    {img.filename}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {canEditWallOfKL && (
                    <button
                      onClick={() => openEditModal(img)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(113,196,255,0.12)', border: '1px solid rgba(113,196,255,0.3)', color: '#71C4FF', padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                    >
                      <Edit3 size={14} /> Edit Details
                    </button>
                  )}
                  {canDeleteWallOfKL && (
                    <button
                      onClick={() => handleDelete(img.filename)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
                      title="Delete Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, maxWidth: 540, width: '100%', padding: 28, position: 'relative' }}>
            <button onClick={() => setShowUploadModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>Add Photo to Wall of KL</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', fontSize: '0.88rem' }}>Upload a weekly contest winning photo to showcase publicly.</p>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Select Image File *</label>
                <input type="file" accept="image/*" onChange={handleFileSelect} required style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                {uploadPreview && (
                  <img src={uploadPreview} alt="Preview" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Title</label>
                <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. Sunset at KL Campus" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Badge Pill Text</label>
                <input type="text" value={uploadBadge} onChange={(e) => setUploadBadge(e.target.value)} placeholder="e.g. 🏆 WEEK #4 CHAMPION" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Photographer / Author Name</label>
                <input type="text" value={uploadAuthor} onChange={(e) => setUploadAuthor(e.target.value)} placeholder="e.g. Rahul V (Y24)" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <button type="submit" disabled={uploading} style={{ marginTop: 10, background: '#f59e0b', color: '#000', fontWeight: 800, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                {uploading ? 'Uploading...' : 'Publish to Wall of KL'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, maxWidth: 500, width: '100%', padding: 28, position: 'relative' }}>
            <button onClick={() => setEditingImage(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800 }}>Edit Capture Details</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', fontSize: '0.85rem' }}>Updating details for {editingImage.filename}</p>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Badge Text (e.g. 🏆 WEEK 4 CHAMPION)</label>
                <input type="text" value={editBadge} onChange={(e) => setEditBadge(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Author / Photographer Name</label>
                <input type="text" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>

              <button type="submit" disabled={savingEdit} style={{ marginTop: 10, background: '#71C4FF', color: '#000', fontWeight: 800, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
