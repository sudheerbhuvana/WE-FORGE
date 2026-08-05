'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Users, Calendar, Trophy, FolderKanban, Bell, ImageIcon, UserPlus, LogOut } from 'lucide-react';
import '@/app/admin/dashboard/AdminDashboard.css';

export default function AdminSidebarWrapper({ activeTab = '' }) {
  const router = useRouter();
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAdminInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  const NAV_ITEMS = [
    { id: 'members', label: 'Members', icon: <Users size={18} />, eliteOnly: false },
    { id: 'events', label: 'Events', icon: <Calendar size={18} />, eliteOnly: false },
    { id: 'contests', label: 'Contests', icon: <Trophy size={18} />, eliteOnly: false },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} />, eliteOnly: true },
    { id: 'notices', label: 'Notices', icon: <Bell size={18} />, eliteOnly: true },
    { id: 'media', label: 'Media', icon: <ImageIcon size={18} />, eliteOnly: true },
    { id: 'recruitments', label: 'Recruitments', icon: <UserPlus size={18} />, eliteOnly: true },
  ].filter((i) => !adminInfo || adminInfo.isElite || !i.eliteOnly);

  const handleNavClick = (id) => {
    router.push(`/admin/dashboard?tab=${id}`);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand" onClick={() => router.push('/admin/dashboard')} style={{ cursor: 'pointer' }}>
        <div className="admin-sidebar__logo">KF</div>
        <span className="admin-sidebar__brand-name">KLFORGE</span>
      </div>

      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-label">MANAGEMENT</div>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-sidebar__item ${isActive ? 'admin-sidebar__item--active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="admin-sidebar__item-icon">{item.icon}</span>
                <span className="admin-sidebar__item-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="admin-sidebar__bottom">
        {adminInfo && (
          <div className="admin-sidebar__user" title={adminInfo.email || ''}>
            <div className="admin-sidebar__user-avatar">
              {(adminInfo.name || adminInfo.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="admin-sidebar__user-text">
              <span className="admin-sidebar__user-name">{adminInfo.name || 'Admin'}</span>
              <span className="admin-sidebar__user-role">
                {adminInfo.isElite ? 'Elite' : adminInfo.role || adminInfo.domain || 'Member'}
              </span>
            </div>
          </div>
        )}
        <button type="button" className="admin-sidebar__logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
