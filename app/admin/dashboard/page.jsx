'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  Users, Calendar, Trophy, FolderKanban, Bell, ImageIcon, UserPlus, Globe, LogOut, FileText, Sparkles, ShieldCheck, Sliders, Menu, X
} from 'lucide-react';

import dynamic from 'next/dynamic';

import memberService from '../../../src/services/memberService';
import eventService from '../../../src/services/eventService';
import noticeService from '../../../src/services/noticeService';
import projectService from '../../../src/services/projectService';

// Lazy-loaded section components for optimal bundle splitting and fast initial page load
const MembersSection = dynamic(() => import('../../../src/components/admin/MembersSection'));
const EventsSection = dynamic(() => import('../../../src/components/admin/EventsSection'));
const ContestsSection = dynamic(() => import('../../../src/components/admin/ContestsSection'));
const ProjectsSection = dynamic(() => import('../../../src/components/admin/ProjectsSection'));
const NoticesSection = dynamic(() => import('../../../src/components/admin/NoticesSection'));
const MediaSection = dynamic(() => import('../../../src/components/admin/MediaSection'));
const WallOfKLSection = dynamic(() => import('../../../src/components/admin/WallOfKLSection'));
const RolesSection = dynamic(() => import('../../../src/components/admin/RolesSection'));
const SystemSettingsSection = dynamic(() => import('../../../src/components/admin/SystemSettingsSection'));
const RecruitmentsSection = dynamic(() => import('../../../src/components/admin/RecruitmentsSection'));
const FormsSection = dynamic(() => import('../../../src/components/admin/FormsSection'));

import '../../../src/components/admin/MemberEditModal.css';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const router = useRouter();

  // Auth & State
  const [loading, setLoading] = useState(true);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [adminInfo, setAdminInfo] = useState({ memberId: '', name: '', role: '', domain: '', isElite: false, permissions: [] });
  const [activeSection, setActiveSection] = useState('members');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');

  // Data lists (fetched on-demand per active tab)
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [media, setMedia] = useState([]);
  const [mediaFolders, setMediaFolders] = useState([]);
  const [recruitmentSettings, setRecruitmentSettings] = useState(null);
  const [recruitmentApps, setRecruitmentApps] = useState([]);
  const [recruitmentSettingsSaving, setRecruitmentSettingsSaving] = useState(false);
  const [contestsList, setContestsList] = useState([]);
  const [fetchedTabs, setFetchedTabs] = useState(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setActiveSection(tab);
    }
    fetchAuthCheck();
  }, []);

  // On-demand lazy fetching when activeSection changes
  useEffect(() => {
    if (!isAdminAuthed) return;
    loadDataForSection(activeSection);
  }, [activeSection, isAdminAuthed]);

  const loadDataForSection = async (sectionKey) => {
    if (fetchedTabs.has(sectionKey)) return;
    setFetchedTabs(prev => new Set([...prev, sectionKey]));

    switch (sectionKey) {
      case 'members':
        fetchMembersData();
        break;
      case 'events':
        fetchEventsData();
        break;
      case 'contests':
        fetchContestsData();
        break;
      case 'projects':
        fetchProjectsData();
        break;
      case 'notices':
        fetchNoticesData();
        break;
      case 'media':
        fetchMediaData();
        break;
      case 'recruitments':
        fetchRecruitmentsData();
        break;
      default:
        break;
    }
  };

  const fetchAuthCheck = async () => {
    try {
      const res = await fetch('/api/auth/check', { credentials: 'include' });
      if (!res.ok) {
        console.warn('Auth check returned status', res.status);
        return;
      }
      const data = await res.json();
      if (data.authenticated) {
        setAdminInfo(data);
        setIsAdminAuthed(true);
        // Initial fast fetch for default section
        loadDataForSection(activeSection || 'members');
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
  const fetchProjectsData = async () => {
    try {
      const pRes = await projectService.getAll();
      if (Array.isArray(pRes)) setProjects(pRes);
    } catch {}
  };
  const fetchNoticesData = async () => {
    try {
      const nRes = await noticeService.getAll();
      if (Array.isArray(nRes)) setNotices(nRes);
    } catch {}
  };
  const fetchMediaData = async () => {
    try {
      const [mRes, fRes] = await Promise.all([
        fetch('/api/media').then(r => r.json()),
        fetch('/api/media/folders').then(r => r.json()),
      ]);
      if (Array.isArray(mRes)) setMedia(mRes);
      if (Array.isArray(fRes)) setMediaFolders(fRes);
    } catch {}
  };
  const fetchRecruitmentsData = async () => {
    try {
      const [rCfgRes, rAppRes] = await Promise.all([
        fetch('/api/recruitments/config').then(r => r.json()),
        fetch('/api/recruitments/applications').then(r => r.json()),
      ]);
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

  const userPerms = Array.isArray(adminInfo.permissions) ? adminInfo.permissions : [];
  const hasModulePerm = (prefix) => userPerms.some(p => p.startsWith(prefix));
  const hasSpecificPerm = (permId) => userPerms.includes(permId);

  const NAV_ITEMS = [
    { id: 'members',      label: 'Members',      icon: <Users size={18} />,        count: members.length,          visible: adminInfo.isElite || adminInfo.isDomainHead || hasSpecificPerm('members.view_all') || hasSpecificPerm('members.view_domain') || hasModulePerm('members.') },
    { id: 'events',       label: 'Events',       icon: <Calendar size={18} />,      count: events.length,           visible: adminInfo.isElite || adminInfo.isDomainHead || hasSpecificPerm('events.view_public') || hasSpecificPerm('events.view_internal') || hasModulePerm('events.') },
    { id: 'contests',     label: 'Contests',     icon: <Trophy size={18} />,        count: contestsList.length,     visible: adminInfo.isElite || adminInfo.isDomainHead || hasSpecificPerm('contests.view') || hasModulePerm('contests.') },
    { id: 'projects',     label: 'Projects',     icon: <FolderKanban size={18} />,  count: projects.length,         visible: adminInfo.isElite || hasSpecificPerm('projects.view') || hasModulePerm('projects.') },
    { id: 'notices',      label: 'Notices',      icon: <Bell size={18} />,          count: notices.length,          visible: adminInfo.isElite || hasSpecificPerm('notices.view') || hasModulePerm('notices.') },
    { id: 'media',        label: 'Media',        icon: <ImageIcon size={18} />,     count: media.length,            visible: adminInfo.isElite || hasSpecificPerm('media.view') || hasModulePerm('media.') },
    { id: 'wallofkl',     label: 'Wall of KL',   icon: <Sparkles size={18} />,      count: null,                    visible: adminInfo.isElite || hasSpecificPerm('wallofkl.view') || hasModulePerm('wallofkl.') },
    { id: 'roles',        label: 'Roles & Permissions', icon: <ShieldCheck size={18} />, count: null,            visible: adminInfo.isElite || hasSpecificPerm('roles.view') || hasModulePerm('roles.') },
    { id: 'settings',     label: 'System & Security', icon: <Sliders size={18} />,     count: null,            visible: adminInfo.isElite },
    { id: 'recruitments', label: 'Recruitments', icon: <UserPlus size={18} />,      count: recruitmentApps.length,  visible: adminInfo.isElite || hasSpecificPerm('recruitments.view_settings') || hasSpecificPerm('recruitments.view_applications') || hasModulePerm('recruitments.') },
    { id: 'forms',        label: 'Forms',        icon: <FileText size={18} />,      count: null,                    visible: adminInfo.isElite || hasSpecificPerm('forms.view') || hasModulePerm('forms.') },
  ].filter(i => i.visible);

  // Auto-switch to first available tab if current activeSection is not visible to this user
  useEffect(() => {
    if (!isAdminAuthed || NAV_ITEMS.length === 0) return;
    const isCurrentActiveValid = NAV_ITEMS.some(n => n.id === activeSection);
    if (!isCurrentActiveValid) {
      setActiveSection(NAV_ITEMS[0].id);
    }
  }, [isAdminAuthed, NAV_ITEMS.length, activeSection]);

  if (loading) {
    return (
      <div className="admin-dash__loading">
        <div className="admin-dash__spinner" />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  const renderActiveSection = () => {
    const targetSection = NAV_ITEMS.some(n => n.id === activeSection) ? activeSection : NAV_ITEMS[0]?.id;
    switch (targetSection) {
      case 'members':
        return <MembersSection members={members} adminInfo={adminInfo} refreshData={fetchMembersData} />;
      case 'events':
        return <EventsSection events={events} adminInfo={adminInfo} refreshData={fetchEventsData} />;
      case 'contests':
        return <ContestsSection contestsList={contestsList} adminInfo={adminInfo} refreshData={fetchContestsData} />;
      case 'projects':
        return <ProjectsSection projects={projects} adminInfo={adminInfo} refreshData={fetchProjectsData} />;
      case 'notices':
        return <NoticesSection notices={notices} adminInfo={adminInfo} refreshData={fetchNoticesData} />;
      case 'media':
        return <MediaSection media={media} events={events} mediaFolders={mediaFolders} adminInfo={adminInfo} refreshData={fetchMediaData} />;
      case 'wallofkl':
        return <WallOfKLSection adminInfo={adminInfo} />;
      case 'roles':
        return <RolesSection adminInfo={adminInfo} />;
      case 'settings':
        return <SystemSettingsSection adminInfo={adminInfo} />;
      case 'recruitments':
        return <RecruitmentsSection recruitmentSettings={recruitmentSettings} recruitmentApps={recruitmentApps} adminInfo={adminInfo} refreshData={fetchRecruitmentsData} />;
      case 'forms':
        return <FormsSection adminInfo={adminInfo} />;
      default:
        return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>No modules accessible for your role.</div>;
    }
  };

  const currentNav = NAV_ITEMS.find(n => n.id === activeSection) || NAV_ITEMS[0] || {
    id: 'admin',
    label: 'Admin Panel',
    icon: <Users size={18} />
  };

  return (
    <div className="admin-dash">
      {/* Mobile Top Header */}
      <header className="admin-mob-header">
        <button 
          className="admin-mob-header__menu-btn" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="admin-mob-header__title-wrap">
          <span className="admin-mob-header__icon">{currentNav?.icon}</span>
          <h1 className="admin-mob-header__title">{currentNav?.label || 'Admin Panel'}</h1>
        </div>
        <img src="/images/favicon.png?v=2" alt="KLFORGE" className="admin-mob-header__logo-img" />
      </header>

      {/* Mobile Left Navigation Drawer */}
      {mobileMenuOpen && (
        <div 
          className="admin-mob-drawer-overlay admin-mob-drawer-overlay--open"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside 
            className="admin-mob-drawer admin-mob-drawer--open"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-mob-drawer__header">
              <div className="admin-mob-drawer__brand">
                <img src="/images/favicon.png?v=2" alt="KLFORGE" className="admin-mob-drawer__logo" />
                <span>ADMIN PANEL</span>
              </div>
              <button className="admin-mob-drawer__close" onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="admin-mob-drawer__nav">
              <div className="admin-mob-drawer__group-label">MANAGEMENT</div>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={`admin-mob-drawer__item ${activeSection === item.id ? 'admin-mob-drawer__item--active' : ''}`}
                  onClick={() => {
                    handleTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="admin-mob-drawer__item-icon">{item.icon}</span>
                  <span className="admin-mob-drawer__item-label">{item.label}</span>
                  {item.count !== undefined && item.count !== null && (
                    <span className="admin-mob-drawer__badge">{item.count}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="admin-mob-drawer__bottom">
              {adminInfo && (
                <div className="admin-mob-drawer__user">
                  <div className="admin-mob-drawer__avatar">
                    {(adminInfo.name || adminInfo.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="admin-mob-drawer__user-meta">
                    <span className="admin-mob-drawer__user-name">{adminInfo.name || 'Admin'}</span>
                    <span className="admin-mob-drawer__user-role">
                      {adminInfo.isElite ? 'Elite' : adminInfo.role || adminInfo.domain || 'Member'}
                    </span>
                  </div>
                </div>
              )}
              <button className="admin-mob-drawer__logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <img src="/images/favicon.png?v=2" alt="KLFORGE Logo" className="admin-sidebar__logo-img" />
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
    </div>
  );
}
