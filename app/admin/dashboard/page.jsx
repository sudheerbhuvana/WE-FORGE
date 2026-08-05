'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  Users, Calendar, Trophy, FolderKanban, Bell, ImageIcon, UserPlus, Globe, LogOut, FileText, Sparkles
} from 'lucide-react';

import memberService from '../../../src/services/memberService';
import eventService from '../../../src/services/eventService';
import noticeService from '../../../src/services/noticeService';
import projectService from '../../../src/services/projectService';

import MembersSection from '../../../src/components/admin/MembersSection';
import EventsSection from '../../../src/components/admin/EventsSection';
import ContestsSection from '../../../src/components/admin/ContestsSection';
import ProjectsSection from '../../../src/components/admin/ProjectsSection';
import NoticesSection from '../../../src/components/admin/NoticesSection';
import MediaSection from '../../../src/components/admin/MediaSection';
import WallOfKLSection from '../../../src/components/admin/WallOfKLSection';
import RecruitmentsSection from '../../../src/components/admin/RecruitmentsSection';
import FormsSection from '../../../src/components/admin/FormsSection';

import '../../../src/components/admin/MemberEditModal.css';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const router = useRouter();

  // Auth & State
  const [loading, setLoading] = useState(true);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [adminInfo, setAdminInfo] = useState({ memberId: '', name: '', role: '', domain: '', isElite: false });
  const [activeSection, setActiveSection] = useState('members');
  const [error, setError] = useState('');

  // Data lists
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [media, setMedia] = useState([]);
  const [mediaFolders, setMediaFolders] = useState([]);
  const [recruitmentApps, setRecruitmentApps] = useState([]);
  const [recruitmentSettings, setRecruitmentSettings] = useState({ isOpen: true, title: '', subtitle: '', description: '', heroImageUrl: '' });
  const [recruitmentSettingsSaving, setRecruitmentSettingsSaving] = useState(false);
  const [contestsList, setContestsList] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setActiveSection(tab);
    }
    fetchAuthCheck();
  }, []);

  const fetchAuthCheck = async () => {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated) {
        setAdminInfo(data);
        setIsAdminAuthed(true);
        await Promise.all([
          fetchMembersData(),
          fetchEventsData(),
          fetchContestsData(),
          data.isElite ? fetchEliteData() : Promise.resolve(),
        ]);
      } else if (data.signedIn) {
        setAccessDenied(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembersData = async () => {
    try { setMembers(await memberService.getAll()); } catch {}
  };
  const fetchEventsData = async () => {
    try { setEvents(await eventService.getAllAdmin()); } catch {}
  };
  const fetchContestsData = async () => {
    try {
      const res = await fetch('/api/contests');
      if (res.ok) setContestsList(await res.json());
    } catch {}
  };
  const fetchEliteData = async () => {
    try {
      const [nRes, pRes, mRes, fRes, rCfgRes, rAppRes] = await Promise.all([
        noticeService.getAll(),
        projectService.getAll(),
        fetch('/api/media').then(r => r.json()),
        fetch('/api/media/folders').then(r => r.json()),
        fetch('/api/recruitments/config').then(r => r.json()),
        fetch('/api/recruitments/applications').then(r => r.json()),
      ]);
      if (Array.isArray(nRes)) setNotices(nRes);
      if (Array.isArray(pRes)) setProjects(pRes);
      if (Array.isArray(mRes)) setMedia(mRes);
      if (Array.isArray(fRes)) setMediaFolders(fRes);
      if (rCfgRes && !rCfgRes.error) setRecruitmentSettings(rCfgRes);
      if (Array.isArray(rAppRes)) setRecruitmentApps(rAppRes);
    } catch {}
  };

  const handleTabChange = (id) => {
    setActiveSection(id);
    setError('');
    window.history.replaceState(null, '', `?tab=${id}`);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (loading) {
    return (
      <div className="admin-dash__loading">
        <div className="admin-dash__spinner" />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'members',      label: 'Members',      icon: <Users size={18} />,        count: members.length,          eliteOnly: false },
    { id: 'events',       label: 'Events',       icon: <Calendar size={18} />,      count: events.length,           eliteOnly: false },
    { id: 'contests',     label: 'Contests',     icon: <Trophy size={18} />,        count: contestsList.length,     eliteOnly: false },
    { id: 'projects',     label: 'Projects',     icon: <FolderKanban size={18} />,  count: projects.length,         eliteOnly: true },
    { id: 'notices',      label: 'Notices',      icon: <Bell size={18} />,          count: notices.length,          eliteOnly: true },
    { id: 'media',        label: 'Media',        icon: <ImageIcon size={18} />,     count: media.length,            eliteOnly: true },
    { id: 'wallofkl',     label: 'Wall of KL',   icon: <Sparkles size={18} />,      count: null,                    eliteOnly: false },
    { id: 'recruitments', label: 'Recruitments', icon: <UserPlus size={18} />,      count: recruitmentApps.length,  eliteOnly: true },
    { id: 'forms',        label: 'Forms',        icon: <FileText size={18} />,      count: null,                    eliteOnly: true },
  ].filter(i => adminInfo.isElite || !i.eliteOnly);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'members':
        return <MembersSection members={members} adminInfo={adminInfo} refreshData={fetchMembersData} />;
      case 'events':
        return <EventsSection events={events} adminInfo={adminInfo} refreshData={fetchEventsData} />;
      case 'contests':
        return <ContestsSection contestsList={contestsList} refreshData={fetchContestsData} />;
      case 'projects':
        return <ProjectsSection projects={projects} refreshData={fetchEliteData} />;
      case 'notices':
        return <NoticesSection notices={notices} refreshData={fetchEliteData} />;
      case 'media':
        return <MediaSection media={media} events={events} mediaFolders={mediaFolders} refreshData={fetchEliteData} />;
      case 'wallofkl':
        return <WallOfKLSection />;
      case 'recruitments':
        return <RecruitmentsSection recruitmentSettings={recruitmentSettings} recruitmentApps={recruitmentApps} refreshData={fetchEliteData} />;
      case 'forms':
        return <FormsSection />;
      default:
        return <MembersSection members={members} adminInfo={adminInfo} refreshData={fetchMembersData} />;
    }
  };

  return (
    <div className="admin-dash">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">KF</div>
          <span className="admin-sidebar__brand-name">KLFORGE</span>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__group">
            <div className="admin-sidebar__group-label">MANAGEMENT</div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`admin-sidebar__item ${activeSection === item.id ? 'admin-sidebar__item--active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                <span className="admin-sidebar__item-icon">{item.icon}</span>
                <span className="admin-sidebar__item-label">{item.label}</span>
                <span className="admin-sidebar__badge">{item.count}</span>
              </button>
            ))}
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
          <button className="admin-sidebar__logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-main__content" data-lenis-prevent="true">
          {renderActiveSection()}
        </div>
      </main>

      {/* Mobile navigation tabs */}
      <nav className="admin-mob-tabs">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`admin-mob-tab ${activeSection === item.id ? 'admin-mob-tab--active' : ''}`}
            onClick={() => handleTabChange(item.id)}
          >
            <span className="admin-mob-tab__icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
