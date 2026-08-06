'use client';

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Bell, X } from 'lucide-react';
import noticeService from '../../../src/services/noticeService';
import '../../../app/admin/dashboard/AdminDashboard.css';

const PRIORITY_COLORS = { low: '#64748b', medium: '#f59e0b', high: '#ef4444' };
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const EMPTY_NOTICE_FORM = { title: '', message: '', priority: 'low' };

export default function NoticesSection({ notices, adminInfo, refreshData }) {
  const userPerms = Array.isArray(adminInfo?.permissions) ? adminInfo.permissions : [];
  const isElite = adminInfo?.isElite || false;

  const canCreateNotice = isElite || userPerms.includes('notices.create');
  const canEditNotice = isElite || userPerms.includes('notices.edit');
  const canDeleteNotice = isElite || userPerms.includes('notices.delete');

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeEditing, setNoticeEditing] = useState(null);
  const [noticeForm, setNoticeForm] = useState(EMPTY_NOTICE_FORM);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeDeleteConfirm, setNoticeDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  const openAddNotice = () => {
    if (!canCreateNotice) return;
    setNoticeEditing(null);
    setNoticeForm(EMPTY_NOTICE_FORM);
    setShowNoticeForm(true);
  };

  const openEditNotice = (n) => {
    if (!canEditNotice) return;
    setNoticeEditing(n);
    setNoticeForm({
      title: n.title || '',
      message: n.message || '',
      priority: n.priority || 'low',
    });
    setShowNoticeForm(true);
  };

  const handleNoticeDelete = async (id) => {
    if (!canDeleteNotice) return;
    try {
      await noticeService.delete(id);
      setNoticeDeleteConfirm(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    setNoticeSaving(true);
    setError('');
    try {
      if (noticeEditing) {
        await noticeService.update(noticeEditing.id, noticeForm);
      } else {
        await noticeService.create(noticeForm);
      }
      setShowNoticeForm(false);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setNoticeSaving(false);
    }
  };

  return (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Notices</h2>
          <p className="admin-section__subtitle">{notices.length} notice{notices.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateNotice && (
          <button className="admin-dash__add-btn" onClick={openAddNotice}><Plus size={18} /> Add Notice</button>
        )}
      </div>
      {error && !showNoticeForm && <div className="admin-dash__error">{error}</div>}

      {/* Desktop table */}
      <div className="admin-dash__table-wrap" data-lenis-prevent="true">
        <table className="admin-dash__table">
          <thead><tr><th>Title</th><th>Message</th><th>Priority</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id}>
                <td className="admin-dash__name-cell">{n.title}</td>
                <td style={{ maxWidth: 260, color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}</td>
                <td><span className="admin-dash__priority-badge" style={{ background: PRIORITY_COLORS[n.priority] || '#555' }}>{n.priority}</span></td>
                <td className="admin-dash__mono">{fmtDate(n.createdAt)}</td>
                <td className="admin-dash__actions-cell">
                  {canEditNotice && (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" aria-label={`Edit notice ${n.title}`} onClick={() => openEditNotice(n)}><Edit3 size={15} aria-hidden="true" /></button>
                  )}
                  {canDeleteNotice && (
                    noticeDeleteConfirm === n.id ? (
                      <span className="admin-dash__delete-confirm">Sure?
                        <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleNoticeDelete(n.id)}>Yes</button>
                        <button className="admin-dash__icon-btn" onClick={() => setNoticeDeleteConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" aria-label={`Delete notice ${n.title}`} onClick={() => setNoticeDeleteConfirm(n.id)}><Trash2 size={15} aria-hidden="true" /></button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {notices.length === 0 && <div className="admin-dash__empty">No notices yet.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {notices.length === 0 && <div className="admin-dash__empty">No notices yet.</div>}
        {notices.map((n) => (
          <div key={n.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              <div className="admin-mob-card__avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background: `${PRIORITY_COLORS[n.priority]}22`, color: PRIORITY_COLORS[n.priority] }}><Bell size={20} /></div>
              <div className="admin-mob-card__info">
                <div className="admin-mob-card__name">{n.title}</div>
                <div className="admin-mob-card__sub">{fmtDate(n.createdAt)}</div>
              </div>
              <span className="admin-dash__priority-badge" style={{ background: PRIORITY_COLORS[n.priority] || '#555', flexShrink:0 }}>{n.priority}</span>
            </div>
            <div className="admin-mob-card__desc">{n.message}</div>
            {canDeleteNotice && noticeDeleteConfirm === n.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this notice?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleNoticeDelete(n.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setNoticeDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                {canEditNotice && <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditNotice(n)}><Edit3 size={15} /> Edit</button>}
                {canDeleteNotice && <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setNoticeDeleteConfirm(n.id)}><Trash2 size={15} /> Delete</button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Notice Modal */}
      {showNoticeForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={() => setShowNoticeForm(false)}>
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleNoticeSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{noticeEditing ? 'Edit Notice' : 'Add Notice'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowNoticeForm(false)}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Title *</label><input required value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="Notice title" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Message *</label><textarea required rows="4" value={noticeForm.message} onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })} placeholder="Notice details..." /></div>
              <div className="admin-dash__field"><label>Priority</label><select value={noticeForm.priority} onChange={e => setNoticeForm({ ...noticeForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowNoticeForm(false)}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={noticeSaving}>{noticeSaving ? 'Saving...' : noticeEditing ? 'Update Notice' : 'Post Notice'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
