'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Download, Search, Edit3, Trash2 } from 'lucide-react';
import memberService, { getAvatarUrl } from '../../../src/services/memberService';
import MemberEditModal from './MemberEditModal';
import './MemberEditModal.css';
import '../../../app/admin/dashboard/AdminDashboard.css';

const ROLE_WEIGHTS = {
  'Head of the Department': 0.1,
  'Alternate Head of Department': 0.2,
  'President': 1,
  'Chief Secretary': 2,
  'Treasurer': 3,
  'Advisor': 5,
  'Chief': 10,
  'Lead': 20,
  'Core Member': 30,
  'Associate': 40,
  'Student': 100
};

const canManageMemberClient = (actor, member) => {
  if (!actor) return false;
  if (actor.isElite) return true;
  if (actor.memberId === member.id) return true;
  if (member.roles && member.roles.some(r => r.domain === actor.domain)) return true;
  return false;
};

export default function MembersSection({ members, adminInfo, refreshData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [memberSort, setMemberSort] = useState('hierarchy');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEditing, setMemberEditing] = useState(null);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberDeleteConfirm, setMemberDeleteConfirm] = useState(null);
  const [domainsList, setDomainsList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/domains')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDomainsList(data);
        }
      })
      .catch(() => {});
  }, []);

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Domain', 'Roll Number'];
    const rows = members.map(m => [m.name, m.email, m.role, m.domain, m.rollNumber].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'forge_members.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMemberDelete = async (id) => {
    try {
      await memberService.delete(id);
      setMemberDeleteConfirm(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMemberSubmit = async (payload, memberId) => {
    setMemberSaving(true);
    setError('');
    try {
      if (memberId) {
        await memberService.update(memberId, payload);
      } else {
        await memberService.create(payload);
      }
      setShowMemberForm(false);
      setMemberEditing(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setMemberSaving(false);
    }
  };

  let filteredMembers = adminInfo.isElite 
    ? members 
    : members.filter(m => m.domain === adminInfo.domain);

  if (searchTerm) {
    const low = searchTerm.toLowerCase();
    filteredMembers = filteredMembers.filter(m => 
      m.name.toLowerCase().includes(low) || 
      m.rollNumber.toLowerCase().includes(low) ||
      (m.domain || '').toLowerCase().includes(low)
    );
  }

  if (memberFilter === 'student') {
    filteredMembers = filteredMembers.filter(m => m.domain === 'General' || m.domain === 'Student');
  } else if (memberFilter !== 'all') {
    filteredMembers = filteredMembers.filter(m => m.domain === memberFilter);
  }

  filteredMembers.sort((a, b) => {
    if (memberSort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (memberSort === 'roll') return (a.rollNumber || '').localeCompare(b.rollNumber || '');
    
    const weightA = ROLE_WEIGHTS[a.role] || 999;
    const weightB = ROLE_WEIGHTS[b.role] || 999;
    if (weightA !== weightB) return weightA - weightB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const activeDomainsList = Array.from(
    new Set([
      ...domainsList.map(d => (typeof d === 'string' ? d : d?.name)),
      ...members.map(m => m.domain),
      'Zero Order', 'Technical', 'Media & Broadcasting', 'Operations & Protocol', 'Creative & Content', 'Advisors', 'Public Speaking'
    ].filter(Boolean))
  ).map(name => ({ name }));

  return (
    <>
      <div className="admin-section__header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 16 }}>
        <div className="admin-dash__title-row">
          <h2 className="admin-section__title admin-section__title--large">Team Members</h2>
          <div className="admin-dash__title-actions">
            <button className="admin-dash__add-btn" onClick={() => { setMemberEditing(null); setShowMemberForm(true); }}><Plus size={18} /> Add Member</button>
            <button className="admin-dash__export-btn" onClick={downloadCSV}><Download size={16} /> Export CSV</button>
          </div>
        </div>
        
        <div className="admin-dash__filter-row" style={{ width: '100%' }}>
          <div className="admin-dash__search-bar">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search name, ID, or domain..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select value={memberSort} onChange={e => setMemberSort(e.target.value)} className="admin-dash__select">
            <option value="hierarchy">Sort by Hierarchy</option>
            <option value="name">Sort by Name</option>
            <option value="roll">Sort by Roll #</option>
          </select>

          <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)} className="admin-dash__select">
            <option value="all">All Domains</option>
            <option value="student">Just Students (No Domain)</option>
            {domainsList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {error && !showMemberForm && <div className="admin-dash__error">{error}</div>}

      {/* Desktop table */}
      <div className="admin-dash__table-wrap" data-lenis-prevent="true">
        <table className="admin-dash__table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Domain</th>
              <th>Role</th>
              <th>Roll #</th>
              <th>Telegram</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id} className="admin-dash__row">
                <td><img className="admin-dash__avatar" src={getAvatarUrl(m)} alt={m.name} /></td>
                <td className="admin-dash__name-cell">{m.name}</td>
                <td><span className="admin-dash__domain-tag">{m.domain}</span></td>
                <td style={{ fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
                  {m.role}
                  {m.isSuspended && <span className="admin-dash__status-badge admin-dash__status-badge--suspended" style={{ marginLeft: 8, background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem' }}>Suspended</span>}
                </td>
                <td className="admin-dash__mono"><Link href={`/${m.id}`} className="admin-dash__profile-link">{m.rollNumber}</Link></td>
                <td className="admin-dash__mono" style={{ color: 'rgba(125,190,255,0.7)' }}>
                  {m.telegram ? (
                    <a href={`https://t.me/${m.telegram}`} target="_blank" rel="noopener noreferrer" className="admin-dash__link">
                      @{m.telegram}
                    </a>
                  ) : '-'}
                </td>
                <td className="admin-dash__actions-cell">
                  {canManageMemberClient(adminInfo, m) && (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" onClick={() => { setMemberEditing(m); setShowMemberForm(true); }} aria-label={`Edit ${m.name}`}><Edit3 size={15} aria-hidden="true" /></button>
                  )}
                  {memberDeleteConfirm === m.id ? (
                    <span className="admin-dash__delete-confirm">Sure?
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleMemberDelete(m.id)}>Yes</button>
                      <button className="admin-dash__icon-btn" onClick={() => setMemberDeleteConfirm(null)}>No</button>
                    </span>
                  ) : (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => setMemberDeleteConfirm(m.id)} aria-label={`Delete ${m.name}`}><Trash2 size={15} aria-hidden="true" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="admin-dash__empty">No members yet. Click &ldquo;Add Member&rdquo; to get started.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {members.length === 0 && <div className="admin-dash__empty">No members yet. Tap &ldquo;Add Member&rdquo; to get started.</div>}
        {members.map((m) => (
          <div key={m.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              <img className="admin-mob-card__avatar" src={getAvatarUrl(m)} alt={m.name} />
              <div className="admin-mob-card__info">
                <Link href={`/${m.id}`} className="admin-mob-card__name" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{m.name}</Link>
                <div className="admin-mob-card__meta" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="admin-dash__type-badge" style={{ background: 'rgba(113, 196, 255, 0.1)', color: '#71C4FF', border: '1px solid rgba(113, 196, 255, 0.2)' }}>{m.domain}</span>
                  <span className="admin-dash__access-tag admin-dash__access-tag--public" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)' }}>{m.role}</span>
                  {m.isSuspended && <span style={{ background: 'rgba(255, 77, 77, 0.2)', color: '#ff4d4d', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>SUSPENDED</span>}
                  <span style={{ fontSize: '0.75rem', opacity: 0.4, display: 'flex', alignItems: 'center' }}>{m.rollNumber}</span>
                  {m.telegram && (
                    <a href={`https://t.me/${m.telegram}`} target="_blank" rel="noopener noreferrer" className="admin-dash__link" style={{ fontSize: '0.75rem' }}>@{m.telegram}</a>
                  )}
                </div>
              </div>
            </div>
            {m.description && <div className="admin-mob-card__desc">{m.description}</div>}
            {memberDeleteConfirm === m.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this member?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleMemberDelete(m.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setMemberDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                {canManageMemberClient(adminInfo, m) && (
                  <>
                    <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => { setMemberEditing(m); setShowMemberForm(true); }}><Edit3 size={15} /> Edit</button>
                    <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setMemberDeleteConfirm(m.id)}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <MemberEditModal
        open={showMemberForm}
        member={memberEditing}
        domainsList={activeDomainsList}
        actor={adminInfo}
        saving={memberSaving}
        onClose={() => setShowMemberForm(false)}
        onSubmit={handleMemberSubmit}
      />
    </>
  );
}
