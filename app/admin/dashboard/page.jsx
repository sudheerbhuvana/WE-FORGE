'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Edit3, Plus, GripVertical, LogOut, X, Users, Calendar, Clock, CheckCircle, FolderKanban, Bell, Globe, Send, Eye, ArrowUp, ArrowDown, Shield, Download, Search, Image as ImageIcon, Video, Upload, Star, Share2, FolderInput, Grid3x3, Tag, Rows3, LayoutGrid } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import authService from '../../../src/services/authService';
import memberService, { getAvatarUrl } from '../../../src/services/memberService';
import eventService from '../../../src/services/eventService';
import noticeService from '../../../src/services/noticeService';
import projectService from '../../../src/services/projectService';
import ModernDateTimePicker from '../../../src/components/ModernDateTimePicker';
import MemberEditModal from '../../../src/components/admin/MemberEditModal';
import '../../../src/components/admin/MemberEditModal.css';
import './AdminDashboard.css';

// ─── Helpers ──────────────────────────────────────────────

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

const EMPTY_EVENT_FORM = {
  title: '', description: '', type: '', points: 0, slots: 50, registrationDeadline: '', startTime: '', endTime: '', venue: '',
  accessType: 'public', allowedDomains: [], allowedMembers: [], roles: ['Participant', 'Volunteer', 'Organizer'], isRegistrationOpen: true
};

const EMPTY_NOTICE_FORM = { title: '', message: '', priority: 'low' };

const EMPTY_PROJECT_FORM = { name: '', description: '', github: '', demo: '', technologies: '' };

function getCroppedBlob(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtRange = (s, e) => {
  if (!s || !e) return '—';
  const start = new Date(s);
  const end = new Date(e);
  const startStr = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const startDate = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const endDate = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (startDate === endDate) {
    return `${startDate}, ${startStr} - ${endStr}`;
  }
  return `${startDate}, ${startStr} - ${endDate}, ${endStr}`;
};
const toInputDate = (iso) => iso ? iso.slice(0, 10) : '';

// ── Permission helpers (mirror lib/permissions.js for the client side) ──
const canManageMemberClient = (actor, member) => {
  if (!actor) return false;
  if (actor.isElite) return true;
  if (actor.memberId === member.id) return true;
  // head-of-domain in client's domain
  if (member.roles && member.roles.some(r => r.domain === actor.domain)) return true;
  return false;
};
const canManageEventClient = (actor, event) => {
  if (!actor) return false;
  if (actor.isElite) return true;
  return event?.domain === actor.domain;
};

// ─── Component ────────────────────────────────────────────

const AdminDashboard = () => {
  const router = useRouter();

  // Auth + shared
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('members');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setActiveSection(tab);
    }
  }, []);

  const handleTabChange = (id) => {
    setActiveSection(id);
    setError('');
    window.history.replaceState(null, '', `?tab=${id}`);
  };

  // Members
  const [members, setMembers] = useState([]);
  const [memberEditing, setMemberEditing] = useState(null);   // member object or null (for "add")
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberDeleteConfirm, setMemberDeleteConfirm] = useState(null);
  const [memberSaving, setMemberSaving] = useState(false);
  const [domainsList, setDomainsList] = useState([]);

  // Drag-and-drop ordering
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Events
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventEditing, setEventEditing] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventPoster, setEventPoster] = useState(null);
  const [eventPosterPreview, setEventPosterPreview] = useState(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventDeleteConfirm, setEventDeleteConfirm] = useState(null);
  const [viewingRegs, setViewingRegs] = useState(null); // { event, regs }

  // Notices
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState(EMPTY_NOTICE_FORM);
  const [noticeEditing, setNoticeEditing] = useState(null);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeDeleteConfirm, setNoticeDeleteConfirm] = useState(null);

  // Projects
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [projectEditing, setProjectEditing] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectImage, setProjectImage] = useState(null);
  const [projectImagePreview, setProjectImagePreview] = useState(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState(null);

  // Media
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaEventTag, setMediaEventTag] = useState('General');
  const [mediaUploadTitle, setMediaUploadTitle] = useState('');
  const [mediaUploadTags, setMediaUploadTags] = useState('');
  const [mediaUploadDesc, setMediaUploadDesc] = useState('');
  const [mediaUploadFavorite, setMediaUploadFavorite] = useState(false);
  const [mediaUploadPreview, setMediaUploadPreview] = useState(null); // local preview of selected file
  const [mediaDeleteConfirm, setMediaDeleteConfirm] = useState(null);  const [editingMediaMeta, setEditingMediaMeta] = useState(null); // { id, title, description } | null
  const [mediaFilterTag, setMediaFilterTag] = useState('all');
  // New media-library state
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaOnlyFavorites, setMediaOnlyFavorites] = useState(false);
  const [mediaSort, setMediaSort] = useState('newest'); // newest | oldest | name | size
  const [mediaLayout, setMediaLayout] = useState('grid'); // grid | list | masonry
  const [mediaFolders, setMediaFolders] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(new Set()); // bulk selection
  const [lightboxMedia, setLightboxMedia] = useState(null);    // view modal
  const [moveTarget, setMoveTarget] = useState(null);          // { ids, current } | null
  const [shareToast, setShareToast] = useState('');

  // Event Access & Registrations
  const [showRegsModal, setShowRegsModal] = useState(false);
  const [selectedEventForRegs, setSelectedEventForRegs] = useState(null);
  const [eventRegs, setEventRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Private Member Picker Search
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberSearchResults, setShowMemberSearchResults] = useState(false);

  // Shared error
  const [error, setError] = useState('');
  const [adminInfo, setAdminInfo] = useState({ authenticated: false, isElite: false, domain: '', role: '' });
  const [memberFilter, setMemberFilter] = useState('all');
  const [memberSort, setMemberSort] = useState('hierarchy');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Fetch helpers ────────────────────────────────────────

  const fetchMembers = async () => { try { setMembers(await memberService.getAll()); } catch { setError('Failed to load members'); } };
  const fetchEvents = async () => { try { setEvents(await eventService.getAll()); } catch { setError('Failed to load events'); } };
  const fetchNotices = async () => { try { setNotices(await noticeService.getAll()); } catch { setError('Failed to load notices'); } };
  const fetchProjects = async () => { try { setProjects(await projectService.getAll()); } catch { setError('Failed to load projects'); } };
  const fetchMedia = async () => {
    setMediaLoading(true);
    try {
        const [res, foldersRes] = await Promise.all([
            fetch('/api/media'),
            fetch('/api/media/folders'),
        ]);
        setMedia(await res.json());
        if (foldersRes.ok) setMediaFolders(await foldersRes.json());
    } catch {
        setError('Failed to load media');
    } finally {
        setMediaLoading(false);
    }
};
  const fetchMediaFolders = async () => { try { const res = await fetch('/api/media/folders'); if (res.ok) setMediaFolders(await res.json()); } catch { /* ignore */ } };

  // ── Fix mobile scroll: stop Lenis and unlock html/body/root ─
  // Lenis in root mode adds overflow:hidden to html+body and intercepts
  // all touch events. We must undo this while the admin page is mounted.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    // Save original styles so we can restore them on unmount
    const savedHtmlOverflow  = html.style.overflow;
    const savedBodyOverflow  = body.style.overflow;
    const savedBodyHeight    = body.style.height;
    const savedHtmlHeight    = html.style.height;
    const savedRootHeight    = root ? root.style.height : '';

    // Stop Lenis so it no longer intercepts touchmove / wheel
    window.__lenis?.stop();

    // Force the full scroll chain to be scrollable
    html.style.overflow  = 'visible';
    html.style.height    = 'auto';
    body.style.overflow  = 'visible';
    body.style.height    = 'auto';
    if (root) root.style.height = 'auto';

    return () => {
      // Restore everything for the rest of the site
      html.style.overflow  = savedHtmlOverflow;
      html.style.height    = savedHtmlHeight;
      body.style.overflow  = savedBodyOverflow;
      body.style.height    = savedBodyHeight;
      if (root) root.style.height = savedRootHeight;
      window.__lenis?.start();
    };
  }, []);

  // ── Role-based admin auth via Microsoft (NextAuth) ──────────────────
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [accessDenied, setAccessDenied]   = useState(false);

  // Restore persisted media layout preference (grid / list / masonry)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('forge-media-layout');
      if (saved === 'grid' || saved === 'list' || saved === 'masonry') {
        setMediaLayout(saved);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('forge-media-layout', mediaLayout); } catch { /* ignore */ }
  }, [mediaLayout]);

  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setAdminInfo(data);
          setIsAdminAuthed(true);

          // Only fetch sections this user can manage. Notice/Project/Media are elite-only.
          const tasks = [fetchMembers(), fetchEvents()];
          if (data.isElite) {
            tasks.push(fetchNotices(), fetchProjects(), fetchMedia());
          }
          return Promise.all(tasks).then(() => setLoading(false));
        } else if (data.signedIn) {
          // Signed in via Microsoft but wrong role
          setAccessDenied(true);
          setLoading(false);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);


  // ── Members ──────────────────────────────────────────────

  const openAddMember = async () => {
    await ensureDomainsLoaded();
    setMemberEditing(null);
    setShowMemberForm(true);
    setError('');
  };
  const openEditMember = async (m) => {
    await ensureDomainsLoaded();
    setMemberEditing(m);
    setShowMemberForm(true);
    setError('');
  };
  const closeMemberForm = () => {
    setShowMemberForm(false);
    setMemberEditing(null);
    setError('');
  };
  const ensureDomainsLoaded = async () => {
    if (domainsList.length > 0) return;
    try {
      const res = await fetch('/api/domains', { credentials: 'include' });
      if (res.ok) setDomainsList(await res.json());
    } catch (e) {
      // graceful fallback — the modal has its own defaults
      console.warn('Failed to load domains, using defaults', e);
    }
  };
  const handleMemberSubmit = async (fd) => {
    setMemberSaving(true);
    setError('');
    try {
      const targetId = memberEditing?.id;
      if (targetId) {
        await memberService.update(targetId, fd);
      } else {
        await memberService.add(fd);
      }
      closeMemberForm();
      await fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setMemberSaving(false);
    }
  };
  const handleMemberDelete = async (id) => {
    try { await memberService.remove(id); setMemberDeleteConfirm(null); await fetchMembers(); } catch (err) { setError(err.message); }
  };

  // ── Events ───────────────────────────────────────────────

  const openAddEvent = () => {
    setEventEditing(null); setEventForm(EMPTY_EVENT_FORM);
    setEventPoster(null); setEventPosterPreview(null); setCrop(undefined); setCompletedCrop(null); setShowEventForm(true); setError('');
  };
  const openEditEvent = (ev) => {
    setEventEditing(ev.id);
    setEventForm({ 
      title: ev.title, 
      description: ev.description, 
      type: ev.type, 
      points: ev.points || 0, 
      slots: ev.slots || 50, 
      registrationDeadline: ev.registrationDeadline || '', 
      startTime: ev.startTime || '',
      endTime: ev.endTime || '',
      venue: ev.venue || ev.location || '',
      accessType: ev.accessType || 'public',
      allowedDomains: ev.allowedDomains || [],
      allowedMembers: ev.allowedMembers || [],
      roles: ev.roles || ['Participant', 'Volunteer', 'Organizer'],
      isRegistrationOpen: ev.isRegistrationOpen ?? true
    });
    setEventPoster(null); setEventPosterPreview(ev.posterUrl || null); setCrop(undefined); setCompletedCrop(null); setShowEventForm(true); setError('');
  };
  const closeEventForm = () => { setShowEventForm(false); setEventEditing(null); setEventForm(EMPTY_EVENT_FORM); setEventPoster(null); setEventPosterPreview(null); setCrop(undefined); setCompletedCrop(null); setError(''); };
  const handleEventPosterChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Poster must be under 5MB'); return; }
    setEventPoster(file); setEventPosterPreview(URL.createObjectURL(file));
  };
  const handleEventSubmit = async (e) => {
    e.preventDefault(); setEventSaving(true); setError('');
    try {
      const fd = new FormData();
      // Scalar fields only
      fd.append('title', eventForm.title || '');
      fd.append('description', eventForm.description || '');
      fd.append('type', eventForm.type || '');
      fd.append('points', String(eventForm.points ?? 0));
      fd.append('slots', String(eventForm.slots ?? 50));
      fd.append('venue', eventForm.venue || '');
      fd.append('accessType', eventForm.accessType || 'public');
      fd.append('isRegistrationOpen', String(eventForm.isRegistrationOpen ?? true));

      // Date/time fields
      if (eventForm.startTime) fd.append('startTime', eventForm.startTime);
      if (eventForm.endTime) fd.append('endTime', eventForm.endTime);
      if (eventForm.registrationDeadline) fd.append('registrationDeadline', eventForm.registrationDeadline);

      // Array fields — serialize as JSON strings
      fd.append('allowedDomains', JSON.stringify(eventForm.allowedDomains || []));
      fd.append('allowedMembers', JSON.stringify((eventForm.allowedMembers || []).map(String)));
      fd.append('roles', JSON.stringify(eventForm.roles || ['Participant', 'Volunteer', 'Organizer']));

      if (eventPoster && completedCrop && imgRef.current) {
        fd.append('poster', await getCroppedBlob(imgRef.current, completedCrop), 'cropped.png');
      } else if (eventPoster) {
        fd.append('poster', eventPoster);
      }
      if (eventEditing) fd.append('id', eventEditing);

      if (eventEditing) { await eventService.update(eventEditing, fd); } else { await eventService.create(fd); }
      setEventForm(EMPTY_EVENT_FORM); setShowEventForm(false); await fetchEvents();
    } catch (err) { setError(err.message); } finally { setEventSaving(false); }
  };
  const handleEventDelete = async (id) => {
    try { await eventService.remove(id); setEventDeleteConfirm(null); await fetchEvents(); } catch (err) { setError(err.message); }
  };

  const viewRegistrations = async (ev) => {
    setSelectedEventForRegs(ev);
    setShowRegsModal(true);
    setRegsLoading(true);
    try {
      const data = await eventService.getRegistrations(ev.id);
      setEventRegs(data);
    } catch (err) { setError(err.message); } finally { setRegsLoading(false); }
  };

  const updateMemberRole = async (regId, newRole) => {
    try {
      await eventService.updateRegistrationRole(selectedEventForRegs.id, regId, newRole);
      // Refresh local list
      setEventRegs(prev => prev.map(r => r.id === regId ? { ...r, role: newRole } : r));
    } catch (err) { setError(err.message); }
  };

  // ── Notices ──────────────────────────────────────────────

  const openAddNotice = () => { setNoticeEditing(null); setNoticeForm(EMPTY_NOTICE_FORM); setShowNoticeForm(true); setError(''); };
  const openEditNotice = (n) => { setNoticeEditing(n.id); setNoticeForm({ title: n.title, message: n.message, priority: n.priority }); setShowNoticeForm(true); setError(''); };
  const closeNoticeForm = () => { setShowNoticeForm(false); setNoticeEditing(null); setNoticeForm(EMPTY_NOTICE_FORM); setError(''); };
  const handleNoticeSubmit = async (e) => {
    e.preventDefault(); setNoticeSaving(true); setError('');
    try {
      if (noticeEditing) { await noticeService.update(noticeEditing, noticeForm); } else { await noticeService.create(noticeForm); }
      closeNoticeForm(); await fetchNotices();
    } catch (err) { setError(err.message); } finally { setNoticeSaving(false); }
  };
  const handleNoticeDelete = async (id) => {
    try { await noticeService.remove(id); setNoticeDeleteConfirm(null); await fetchNotices(); } catch (err) { setError(err.message); }
  };

  // ── Projects ─────────────────────────────────────────────

  const openAddProject = () => { setProjectEditing(null); setProjectForm(EMPTY_PROJECT_FORM); setProjectImage(null); setProjectImagePreview(null); setCrop(undefined); setCompletedCrop(null); setShowProjectForm(true); setError(''); };
  const openEditProject = (p) => { setProjectEditing(p.id); setProjectForm({ name: p.name, description: p.description, github: p.github, demo: p.demo, technologies: p.technologies.join(', ') }); setProjectImage(null); setProjectImagePreview(p.imageUrl || null); setCrop(undefined); setCompletedCrop(null); setShowProjectForm(true); setError(''); };
  const closeProjectForm = () => { setShowProjectForm(false); setProjectEditing(null); setProjectForm(EMPTY_PROJECT_FORM); setProjectImage(null); setProjectImagePreview(null); setCrop(undefined); setCompletedCrop(null); setError(''); };
  
  const handleProjectImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setProjectImage(file); setProjectImagePreview(URL.createObjectURL(file));
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault(); setProjectSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', projectForm.name.trim());
      if (projectForm.description) fd.append('description', projectForm.description.trim());
      if (projectForm.github) fd.append('github', projectForm.github.trim());
      if (projectForm.demo) fd.append('demo', projectForm.demo.trim());
      fd.append('technologies', JSON.stringify(projectForm.technologies.split(',').map(t => t.trim()).filter(Boolean)));
      if (projectImage && completedCrop && imgRef.current) {
        fd.append('image', await getCroppedBlob(imgRef.current, completedCrop), 'cropped.png');
      } else if (projectImage) {
        fd.append('image', projectImage);
      }

      if (projectEditing) { await projectService.update(projectEditing, fd); } else { await projectService.create(fd); }
      closeProjectForm(); await fetchProjects();
    } catch (err) { setError(err.message); } finally { setProjectSaving(false); }
  };
  const handleProjectDelete = async (id) => {
    try { await projectService.remove(id); setProjectDeleteConfirm(null); await fetchProjects(); } catch (err) { setError(err.message); }
  };

  // ── Media ────────────────────────────────────────────────
  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Multi-file: upload all sequentially using the same form fields, no preview
    if (files.length > 1) {
      await performMultiUpload(files);
      return;
    }

    // Single file: build a local preview URL so the user can see what they picked
    const file = files[0];
    if (mediaUploadPreview) URL.revokeObjectURL(mediaUploadPreview);
    setMediaUploadPreview(URL.createObjectURL(file));
    // Derive title from the file name (e.g. "DSC_5678.jpg" → "DSC 5678")
    const derived = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    setMediaUploadTitle(derived);
  };

  const performUpload = async () => {
    const fileInput = document.getElementById('media-upload');
    const file = fileInput?.files?.[0];
    if (!file) return;
    if (!mediaUploadTags.trim()) {
      setError('Please add at least one tag before uploading.');
      return;
    }
    setMediaUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('eventName', mediaEventTag || 'General');
      fd.append('title', mediaUploadTitle);
      fd.append('description', mediaUploadDesc);
      fd.append('tags', mediaUploadTags);
      fd.append('favorite', mediaUploadFavorite ? 'true' : 'false');
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      await fetchMedia();
      // Reset form
      setShowMediaUpload(false);
      setMediaUploadTitle('');
      setMediaUploadTags('');
      setMediaUploadDesc('');
      setMediaUploadFavorite(false);
      if (mediaUploadPreview) URL.revokeObjectURL(mediaUploadPreview);
      setMediaUploadPreview(null);
      if (fileInput) fileInput.value = '';
    } catch (err) { setError(err.message); } finally { setMediaUploading(false); }
  };

  const cancelUpload = () => {
    setShowMediaUpload(false);
    setMediaUploadTitle('');
    setMediaUploadTags('');
    setMediaUploadDesc('');
    setMediaUploadFavorite(false);
    if (mediaUploadPreview) URL.revokeObjectURL(mediaUploadPreview);
    setMediaUploadPreview(null);
    const fileInput = document.getElementById('media-upload');
    if (fileInput) fileInput.value = '';
    setError('');
  };

  const handleMediaDelete = async (id) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setMediaDeleteConfirm(null);
      selectedMedia.delete(id);
      setSelectedMedia(new Set(selectedMedia));
      await fetchMedia();
    } catch (err) {
      console.error('Media delete error:', err);
      setError(err.message);
    }
  };

  // Update title / description on an existing media item
  const updateMediaMeta = async (id, patch) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setEditingMediaMeta(null);
      await fetchMedia();
    } catch (err) {
      setError(err.message);
    }
  };

// Toggle single item favorite
  const toggleFavorite = async (item) => {
    try {
      const res = await fetch(`/api/media/${item._id || item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !item.favorite }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Favorite failed');
      }
      await fetchMedia();
    } catch (err) {
      setError(err.message);
    }
  };

  // Bulk: favorite / unfavorite / move / delete
  const bulkFavorite = async (favorite) => {
    const ids = Array.from(selectedMedia);
    if (ids.length === 0) return;
    try {
      const res = await fetch('/api/media/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'set', favorite }),
      });
      if (!res.ok) throw new Error('Bulk favorite failed');
      setSelectedMedia(new Set());
      await fetchMedia();
    } catch (err) { setError(err.message); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedMedia);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} item${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      for (const id of ids) {
        await fetch(`/api/media/${id}`, { method: 'DELETE' });
      }
      setSelectedMedia(new Set());
      await fetchMedia();
    } catch (err) { setError(err.message); }
  };

  const bulkMove = async (folder) => {
    const ids = Array.from(selectedMedia);
    if (ids.length === 0 || !folder.trim()) return;
    try {
      const res = await fetch('/api/media/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'move', folder }),
      });
      if (!res.ok) throw new Error('Move failed');
      setSelectedMedia(new Set());
      setMoveTarget(null);
      await fetchMedia();
    } catch (err) { setError(err.message); }
  };

  const moveOne = async (item, folder) => {
    try {
      const res = await fetch(`/api/media/${item._id || item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      if (!res.ok) throw new Error('Move failed');
      setMoveTarget(null);
      await fetchMedia();
    } catch (err) { setError(err.message); }
  };

  const copyShareLink = async (item) => {
    const url = item.url;
    try {
      await navigator.clipboard.writeText(url);
      // simple transient toast via setError (negative slot re-used for success)
      setError('');
      // Use a tiny ephemeral flag instead — set media share toast id
      setShareToast(`Copied link for "${item.title || item.eventName || 'media'}"`);
      setTimeout(() => setShareToast(''), 2200);
    } catch {
      // Fallback: open prompt
      window.prompt('Copy this link:', url);
    }
  };

  // Bulk download — uses JSZip (loaded on demand) to bundle the selected items
  // into a single zip. If JSZip fails to load, falls back to one-click downloads.
  const bulkDownload = async () => {
    const ids = Array.from(selectedMedia);
    if (ids.length === 0) return;
    const items = media.filter((m) => ids.includes(m._id || m.id));
    if (items.length === 0) return;

    setShareToast(`Preparing ${items.length} file${items.length === 1 ? '' : 's'}…`);
    try {
      const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
      const zip = new JSZip();
      const folder = zip.folder('forge-media') || zip;
      const seen = new Map(); // filename -> count (avoid collisions)

      for (const m of items) {
        try {
          const res = await fetch(m.url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const ext = (m.mimeType?.split('/')[1] || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
          let base = (m.title || m.folder || m.eventName || 'media')
            .replace(/[^a-z0-9._-]+/gi, '_')
            .slice(0, 80) || 'media';
          // Avoid duplicates inside the zip
          const count = seen.get(base) || 0;
          seen.set(base, count + 1);
          const filename = count === 0 ? `${base}.${ext}` : `${base}_${count + 1}.${ext}`;
          folder.file(filename, blob);
        } catch {
          // skip failures but continue
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `forge-media-${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShareToast(`Downloaded ${items.length} file${items.length === 1 ? '' : 's'} as zip`);
    } catch (err) {
      // Fallback to direct downloads (browser may prompt for each)
      for (const m of items) {
        const a = document.createElement('a');
        a.href = m.url;
        a.download = '';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setShareToast('Download started (zip library unavailable, individual files)');
    } finally {
      setTimeout(() => setShareToast(''), 2400);
    }
  };

  // Multi-file upload — send a list of files through the same endpoint sequentially
  const performMultiUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!mediaUploadTags.trim()) {
      setError('Please add at least one tag before uploading.');
      return;
    }
    setMediaUploading(true);
    setError('');
    let ok = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('eventName', mediaEventTag || 'General');
        const derivedTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        fd.append('title', mediaUploadTitle || derivedTitle);
        fd.append('description', mediaUploadDesc);
        fd.append('tags', mediaUploadTags);
        fd.append('favorite', mediaUploadFavorite ? 'true' : 'false');
        const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
        if (!res.ok) failed++;
        else ok++;
      } catch {
        failed++;
      }
    }
    setMediaUploading(false);
    setShareToast(`Uploaded ${ok}${failed ? `, ${failed} failed` : ''}`);
    setTimeout(() => setShareToast(''), 2400);
    await fetchMedia();
    cancelUpload();
  };

  // share toast local state — declared at the top of the component with the rest

  const handleLogout = async () => { await signOut({ callbackUrl: '/login' }); };

  if (loading) return <div className="admin-dash"><div className="admin-dash__loading">Loading...</div></div>;

  if (!isAdminAuthed) {
    return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div style={{ width: 400, padding: '48px 40px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
        <Shield size={44} style={{ color: '#fff' }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>Admin Panel</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
            {accessDenied
              ? 'Your account does not have admin access. Only Chiefs, Advisors and Zero Order members can access this panel.'
              : 'Sign in with your KL University Microsoft account. Access is role-based — no password required.'}
          </p>
        </div>
        {accessDenied ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ width: '100%', padding: '14px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 12, color: '#ff6b6b', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign out and try another account
          </button>
        ) : (
          <button
            onClick={() => {
              const signInNextAuth = require('next-auth/react').signIn;
              signInNextAuth('azure-ad', { callbackUrl: '/admin/dashboard' });
            }}
            style={{ width: '100%', padding: '14px', background: '#fff', border: 'none', borderRadius: 12, color: '#000', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <img src="https://authjs.dev/img/providers/azure.svg" alt="Microsoft" width={20} />
            Continue with Microsoft
          </button>
        )}
      </div>
    </div>
    );
  }

  // ── Nav ───────────────────────────────────────────────────
  // Head-level tabs are visible to everyone with any role. Elite-only
  // tabs (Notices / Projects / Media) only show to org-wide admins.
  const NAV_ITEMS = [
    { id: 'members',  label: 'Members',  icon: <Users size={18} />,       count: members.length, eliteOnly: false },
    { id: 'events',   label: 'Events',   icon: <Calendar size={18} />,     count: events.length,   eliteOnly: false },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} />, count: projects.length, eliteOnly: true },
    { id: 'notices',  label: 'Notices',  icon: <Bell size={18} />,         count: notices.length,  eliteOnly: true },
    { id: 'media',    label: 'Media',    icon: <ImageIcon size={18} />,    count: media.length,    eliteOnly: true },
  ].filter(i => adminInfo.isElite || !i.eliteOnly);

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

  // ── Section Renderers ─────────────────────────────────────

  const renderMembersSection = () => {
    let filteredMembers = adminInfo.isElite 
      ? members 
      : members.filter(m => m.domain === adminInfo.domain);

    // Search
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      filteredMembers = filteredMembers.filter(m => 
        m.name.toLowerCase().includes(low) || 
        m.rollNumber.toLowerCase().includes(low) ||
        (m.domain || '').toLowerCase().includes(low)
      );
    }

    // Filter by UI selection
    if (memberFilter === 'student') {
      filteredMembers = filteredMembers.filter(m => m.domain === 'General' || m.domain === 'Student');
    } else if (memberFilter !== 'all') {
      filteredMembers = filteredMembers.filter(m => m.domain === memberFilter);
    }

    // Sorting
    filteredMembers.sort((a, b) => {
      // Manual Sorting
      if (memberSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (memberSort === 'roll') return (a.rollNumber || '').localeCompare(b.rollNumber || '');
      
      // Default: Hierarchy Sort
      const weightA = ROLE_WEIGHTS[a.role] || 999;
      const weightB = ROLE_WEIGHTS[b.role] || 999;
      if (weightA !== weightB) return weightA - weightB;
      return (a.name || '').localeCompare(b.name || '');
    });

    const domains = Array.from(new Set(members.map(m => m.domain))).filter(Boolean);

    return (
      <>
        <div className="admin-section__header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 16 }}>
          <div className="admin-dash__title-row">
            <h2 className="admin-section__title admin-section__title--large">Team Members</h2>
            <div className="admin-dash__title-actions">
              <button className="admin-dash__add-btn" onClick={openAddMember}><Plus size={18} /> Add Member</button>
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
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
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
              {filteredMembers.map((m, idx) => (
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
                  <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" onClick={() => openEditMember(m)} aria-label={`Edit ${m.name}`}><Edit3 size={15} aria-hidden="true" /></button>
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
        {members.map((m, idx) => (
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
                <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditMember(m)}><Edit3 size={15} /> Edit</button>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setMemberDeleteConfirm(m.id)}><Trash2 size={15} /></button>
                </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
    );
  };

  const TYPE_BADGE_COLORS = { workshop: '#3b82f6', hackathon: '#f59e0b', competition: '#ef4444', talk: '#8b5cf6', seminar: '#10b981' };
  const PRIORITY_COLORS = { low: '#64748b', medium: '#f59e0b', high: '#ef4444' };

  const renderEventsSection = () => (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Events</h2>
          <p className="admin-section__subtitle">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-dash__add-btn" onClick={openAddEvent}><Plus size={18} /> Add Event</button>
      </div>
      {error && !showEventForm && <div className="admin-dash__error">{error}</div>}

      {/* Desktop table */}
      <div className="admin-dash__table-wrap" data-lenis-prevent="true">
        <table className="admin-dash__table">
          <thead><tr><th>Poster</th><th>Title</th><th>Type</th><th>Access</th><th>Event Date</th><th>Slots</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>
                  {ev.posterUrl
                    ? <img className="admin-dash__avatar" src={ev.posterUrl} alt={ev.title} style={{ borderRadius: 6, objectFit: 'cover' }} />
                    : <span className="admin-dash__no-poster">—</span>}
                </td>
                <td className="admin-dash__name-cell">{ev.title}</td>
                <td><span className="admin-dash__type-badge" style={{ background: TYPE_BADGE_COLORS[ev.type] || '#555' }}>{ev.type}</span></td>
                <td><span className={`admin-dash__access-tag admin-dash__access-tag--${ev.accessType || 'public'}`}>{ev.accessType || 'public'}</span></td>
                <td className="admin-dash__mono" style={{ fontSize: '0.75rem' }}>{fmtRange(ev.startTime, ev.endTime)}</td>
                <td className="admin-dash__mono">{ev.registeredCount} / {ev.slots}</td>
                <td><span className={`admin-dash__status admin-dash__status--${ev.status}`}>{ev.status}</span></td>
                <td className="admin-dash__actions-cell">
                  <button className="admin-dash__icon-btn" title="View Event Page" aria-label={`View event ${ev.title}`} onClick={() => router.push(`/events/${ev.id}`)}><Eye size={15} aria-hidden="true" /></button>
                  {(adminInfo.isElite || canManageEventClient(adminInfo, ev)) && (
                  <>
                  <button className="admin-dash__icon-btn" title="View Registrations" aria-label={`View registrations for ${ev.title}`} onClick={() => viewRegistrations(ev)}><Users size={15} aria-hidden="true" /></button>
                  <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" aria-label={`Edit event ${ev.title}`} onClick={() => openEditEvent(ev)}><Edit3 size={15} aria-hidden="true" /></button>
                  </>
                  )}
                  {eventDeleteConfirm === ev.id ? (
                    <span className="admin-dash__delete-confirm">Sure?
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleEventDelete(ev.id)}>Yes</button>
                      <button className="admin-dash__icon-btn" onClick={() => setEventDeleteConfirm(null)}>No</button>
                    </span>
                  ) : (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" aria-label={`Delete event ${ev.title}`} onClick={() => setEventDeleteConfirm(ev.id)}><Trash2 size={15} aria-hidden="true" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <div className="admin-dash__empty">No events yet. Click &ldquo;Add Event&rdquo; to create one.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {events.length === 0 && <div className="admin-dash__empty">No events yet. Tap &ldquo;Add Event&rdquo; to create one.</div>}
        {events.map((ev) => (
          <div key={ev.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              {ev.posterUrl
                ? <img className="admin-mob-card__avatar admin-mob-card__avatar--event" src={ev.posterUrl} alt={ev.title} />
                : <div className="admin-mob-card__avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(125,190,255,0.08)', color:'rgba(125,190,255,0.4)', fontSize:'1.2rem' }}><Calendar size={20} /></div>}
              <div className="admin-mob-card__info">
                <div className="admin-mob-card__name">{ev.title}</div>
                <div className="admin-mob-card__sub">{fmtDate(ev.eventDate)} &bull; {ev.registeredCount}/{ev.slots} slots</div>
              </div>
            </div>
            <div className="admin-mob-card__chips">
              <span className="admin-dash__type-badge" style={{ background: TYPE_BADGE_COLORS[ev.type] || '#555' }}>{ev.type}</span>
              <span className={`admin-dash__status admin-dash__status--${ev.status}`}>{ev.status}</span>
            </div>
            {ev.description && <div className="admin-mob-card__desc">{ev.description}</div>}
            {eventDeleteConfirm === ev.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this event?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleEventDelete(ev.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setEventDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                <button className="admin-mob-btn" onClick={() => router.push(`/events/${ev.id}`)}><Eye size={15} /> View</button>
                {(adminInfo.isElite || canManageEventClient(adminInfo, ev)) && (
                <>
                <button className="admin-mob-btn" onClick={() => viewRegistrations(ev)}><Users size={15} /> Regs</button>
                <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditEvent(ev)}><Edit3 size={15} /> Edit</button>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setEventDeleteConfirm(ev.id)}><Trash2 size={15} /></button>
                </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderNoticesSection = () => (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Notices</h2>
          <p className="admin-section__subtitle">{notices.length} notice{notices.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-dash__add-btn" onClick={openAddNotice}><Plus size={18} /> Add Notice</button>
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
                  <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" aria-label={`Edit notice ${n.title}`} onClick={() => openEditNotice(n)}><Edit3 size={15} aria-hidden="true" /></button>
                  {noticeDeleteConfirm === n.id ? (
                    <span className="admin-dash__delete-confirm">Sure?
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleNoticeDelete(n.id)}>Yes</button>
                      <button className="admin-dash__icon-btn" onClick={() => setNoticeDeleteConfirm(null)}>No</button>
                    </span>
                  ) : (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" aria-label={`Delete notice ${n.title}`} onClick={() => setNoticeDeleteConfirm(n.id)}><Trash2 size={15} aria-hidden="true" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {notices.length === 0 && <div className="admin-dash__empty">No notices yet. Click &ldquo;Add Notice&rdquo; to post one.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {notices.length === 0 && <div className="admin-dash__empty">No notices yet. Tap &ldquo;Add Notice&rdquo; to post one.</div>}
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
            {noticeDeleteConfirm === n.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this notice?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleNoticeDelete(n.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setNoticeDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditNotice(n)}><Edit3 size={15} /> Edit</button>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setNoticeDeleteConfirm(n.id)}><Trash2 size={15} /> Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderProjectsSection = () => (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Projects</h2>
          <p className="admin-section__subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="admin-dash__add-btn" onClick={openAddProject}><Plus size={18} /> Add Project</button>
      </div>
      {error && !showProjectForm && <div className="admin-dash__error">{error}</div>}

      {/* Desktop table */}
      <div className="admin-dash__table-wrap" data-lenis-prevent="true">
        <table className="admin-dash__table">
          <thead><tr><th>Name</th><th>Technologies</th><th>GitHub</th><th>Actions</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="admin-dash__name-cell">{p.name}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="admin-dash__tech-tag">{t}</span>
                    ))}
                    {p.technologies.length > 4 && <span className="admin-dash__tech-tag">+{p.technologies.length - 4}</span>}
                  </div>
                </td>
                <td>
                  {p.github ? <a href={p.github} target="_blank" rel="noopener noreferrer" className="admin-dash__link">GitHub ↗</a> : '—'}
                </td>
                <td className="admin-dash__actions-cell">
                  <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" aria-label={`Edit project ${p.name}`} onClick={() => openEditProject(p)}><Edit3 size={15} aria-hidden="true" /></button>
                  {projectDeleteConfirm === p.id ? (
                    <span className="admin-dash__delete-confirm">Sure?
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleProjectDelete(p.id)}>Yes</button>
                      <button className="admin-dash__icon-btn" onClick={() => setProjectDeleteConfirm(null)}>No</button>
                    </span>
                  ) : (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" aria-label={`Delete project ${p.name}`} onClick={() => setProjectDeleteConfirm(p.id)}><Trash2 size={15} aria-hidden="true" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && <div className="admin-dash__empty">No projects yet. Click &ldquo;Add Project&rdquo; to showcase one.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {projects.length === 0 && <div className="admin-dash__empty">No projects yet. Tap &ldquo;Add Project&rdquo; to showcase one.</div>}
        {projects.map((p) => (
          <div key={p.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              <div className="admin-mob-card__avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(125,190,255,0.08)', color:'rgba(125,190,255,0.5)' }}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'10px' }} /> : <FolderKanban size={20} />}
              </div>
              <div className="admin-mob-card__info">
                <div className="admin-mob-card__name">{p.name}</div>
                {p.github && <div className="admin-mob-card__sub"><a href={p.github} target="_blank" rel="noopener noreferrer" className="admin-dash__link">GitHub ↗</a></div>}
              </div>
            </div>
            {p.technologies.length > 0 && (
              <div className="admin-mob-card__chips">
                {p.technologies.slice(0, 5).map((t) => <span key={t} className="admin-dash__tech-tag">{t}</span>)}
                {p.technologies.length > 5 && <span className="admin-dash__tech-tag">+{p.technologies.length - 5}</span>}
              </div>
            )}
            {p.description && <div className="admin-mob-card__desc">{p.description}</div>}
            {projectDeleteConfirm === p.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this project?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleProjectDelete(p.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setProjectDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditProject(p)}><Edit3 size={15} /> Edit</button>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setProjectDeleteConfirm(p.id)}><Trash2 size={15} /> Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderMediaSection = () => {
    const tagOptions = ['all', 'General', ...Array.from(new Set(events.map((e) => e.title).filter(Boolean)))];
    const folders = Array.from(new Set([
        'General',
        ...events.map((e) => e.title).filter(Boolean),
        ...media.map((m) => m.folder || m.eventName || 'General'),
    ]));

    // ── Filtering pipeline ─────────────────────────────────
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
        (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q))),
      );
    }
    // Sort
    list.sort((a, b) => {
      if (mediaSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (mediaSort === 'name')    return (a.title || a.folder || '').localeCompare(b.title || b.folder || '');
      if (mediaSort === 'size')    return (b.fileSize || 0) - (a.fileSize || 0);
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

    return (
      <>
        {/* Toolbar */}
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
              aria-label="Sort media"
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
            <div className="admin-media__view-switch" role="group" aria-label="View mode">
              <button
                type="button"
                className={`admin-media__view-btn ${mediaLayout === 'grid' ? 'admin-media__view-btn--active' : ''}`}
                onClick={() => setMediaLayout('grid')}
                aria-label="Grid view"
                aria-pressed={mediaLayout === 'grid'}
                title="Grid"
              >
                <Grid3x3 size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`admin-media__view-btn ${mediaLayout === 'list' ? 'admin-media__view-btn--active' : ''}`}
                onClick={() => setMediaLayout('list')}
                aria-label="List view"
                aria-pressed={mediaLayout === 'list'}
                title="List"
              >
                <Rows3 size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`admin-media__view-btn ${mediaLayout === 'masonry' ? 'admin-media__view-btn--active' : ''}`}
                onClick={() => setMediaLayout('masonry')}
                aria-label="Masonry view"
                aria-pressed={mediaLayout === 'masonry'}
                title="Masonry"
              >
                <LayoutGrid size={14} aria-hidden="true" />
              </button>
            </div>
            <button
              className="admin-media__bulk-btn"
              onClick={selectAllVisible}
              disabled={list.length === 0}
            >
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
        </div>

        {/* Tags chip row — clickable, filters by tag */}
        {(() => {
          const allTags = Array.from(new Set(media.flatMap((m) => Array.isArray(m.tags) ? m.tags : []))).sort();
          if (allTags.length === 0) return null;
          return (
            <div className="admin-media__tags-row">
              <span className="admin-media__tags-label"><Tag size={11} /> Tags</span>
              <div className="admin-media__tags-chips">
                {allTags.map((t) => (
                  <button
                    key={t}
                    className={`admin-media__tag-chip ${mediaSearch.trim().toLowerCase() === t.toLowerCase() ? 'admin-media__tag-chip--active' : ''}`}
                    onClick={() => setMediaSearch(mediaSearch === t ? '' : t)}
                    title={`Filter by #${t}`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bulk action bar */}
        {selectedMedia.size > 0 && (
          <div className="admin-media__bulkbar">
            <span className="admin-media__bulkbar-count">
              {selectedMedia.size} selected
            </span>
            <div className="admin-media__bulkbar-actions">
              <button className="admin-media__bulkbar-btn" onClick={bulkDownload}>
                <Download size={14} /> Download zip
              </button>
              <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(true)}>
                <Star size={14} /> Favorite
              </button>
              <button className="admin-media__bulkbar-btn" onClick={() => bulkFavorite(false)}>
                <Star size={14} /> Unfavorite
              </button>
              <button className="admin-media__bulkbar-btn" onClick={() => setMoveTarget({ ids: Array.from(selectedMedia), current: null })}>
                <FolderInput size={14} /> Move to
              </button>
              <button className="admin-media__bulkbar-btn admin-media__bulkbar-btn--danger" onClick={bulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="admin-media__bulkbar-btn" onClick={() => setSelectedMedia(new Set())}>
                <X size={14} /> Clear
              </button>
            </div>
          </div>
        )}

        {shareToast && (
          <div className="admin-media__toast" role="status">{shareToast}</div>
        )}

        {/* Grid */}
        {mediaLoading ? (
          <div className="admin-dash__loading">Syncing with R2...</div>
        ) : list.length === 0 ? (
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
                <div
                  key={mid}
                  className={`admin-media__row ${selected ? 'admin-media__row--selected' : ''}`}
                >
                  <label className="admin-media__row-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(mid)}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-media__row-thumb"
                    onClick={() => setLightboxMedia(m)}
                    aria-label={`View ${m.title || m.folder || 'media'}`}
                  >
                    {m.type === 'video' ? (
                      <video src={m.url} muted />
                    ) : (
                      <img src={m.url} alt={m.title || m.folder} loading="lazy" />
                    )}
                    {m.favorite && <span className="admin-media__fav-pill"><Star size={9} /></span>}
                  </button>
                  <div className="admin-media__row-title">
                    {m.title || <span className="muted">Untitled</span>}
                  </div>
                  <div className="admin-media__row-folder">
                    <span className="admin-media__tag">{m.folder || m.eventName || 'General'}</span>
                  </div>
                  <div className="admin-media__row-type">{m.type}</div>
                  <div className="admin-media__row-num">
                    {m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(1)} MB` : '—'}
                  </div>
                  <div className="admin-media__row-date">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                  </div>
                  <div className="admin-media__row-actions">
                    <button className="admin-media__btn" onClick={() => setEditingMediaMeta({ id: mid, title: m.title || '', description: m.description || '' })} title="Edit title & description"><Edit3 size={14} /></button>
                    <button className="admin-media__btn" onClick={() => copyShareLink(m)} title="Copy link"><Share2 size={14} /></button>
                    <button
                      className={`admin-media__btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`}
                      onClick={() => toggleFavorite(m)}
                      title={m.favorite ? 'Unfavorite' : 'Favorite'}
                      aria-pressed={!!m.favorite}
                    >
                      <Star size={14} fill={m.favorite ? '#ffd86b' : 'none'} />
                    </button>
                    <button className="admin-media__btn" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })} title="Move"><FolderInput size={14} /></button>
                    <button className="admin-media__btn admin-media__btn--danger" onClick={() => setMediaDeleteConfirm(mid)} title="Delete"><Trash2 size={14} /></button>
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
                <div
                  key={mid}
                  className={`admin-media__card ${selected ? 'admin-media__card--selected' : ''}`}
                >
                  <div className="admin-media__preview" onClick={() => setLightboxMedia(m)}>
                    {m.type === 'video' ? (
                      <video src={m.url} className="admin-media__asset" muted />
                    ) : (
                      <img src={m.url} alt={m.title || m.folder || 'media'} className="admin-media__asset" loading="lazy" />
                    )}
                    <div className="admin-media__hover" onClick={(e) => e.stopPropagation()}>
                      <button className="admin-media__btn" onClick={() => setLightboxMedia(m)} title="View">
                        <Eye size={16} />
                      </button>
                      <button className="admin-media__btn" onClick={() => setEditingMediaMeta({ id: mid, title: m.title || '', description: m.description || '' })} title="Edit title & description">
                        <Edit3 size={16} />
                      </button>
                      <button className="admin-media__btn" onClick={() => copyShareLink(m)} title="Copy link">
                        <Share2 size={16} />
                      </button>
                      <button className="admin-media__btn" onClick={() => setMoveTarget({ ids: [mid], current: m.folder || m.eventName })} title="Move to…">
                        <FolderInput size={16} />
                      </button>
                      <button
                        className={`admin-media__btn ${m.favorite ? 'admin-media__btn--fav-active' : ''}`}
                        onClick={() => toggleFavorite(m)}
                        title={m.favorite ? 'Unfavorite' : 'Favorite'}
                        aria-pressed={!!m.favorite}
                      >
                        <Star size={16} fill={m.favorite ? '#ffd86b' : 'none'} />
                      </button>
                      <button className="admin-media__btn admin-media__btn--danger" onClick={() => setMediaDeleteConfirm(mid)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {m.favorite && <span className="admin-media__fav-pill"><Star size={10} /> Fav</span>}
                  </div>
                  <div className="admin-media__info">
                    <label className="admin-media__select" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(mid)}
                      />
                      <span>Select</span>
                    </label>
                    <span className="admin-media__tag">{m.folder || m.eventName || 'General'}</span>
                    <span className="admin-media__meta">
                      {m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'}
                      {' \u00b7 '}
                      {m.type}
                      {m.width && m.height ? ` · ${m.width}×${m.height}` : ''}
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

        {/* Upload modal (kept) */}
        {showMediaUpload && (
          <div className="admin-dash__overlay">
            <div className="admin-dash__modal" style={{ maxWidth: '480px' }}>
              <div className="admin-dash__modal-header">
                <h2>Upload</h2>
                <button className="admin-dash__close-btn" onClick={cancelUpload}><X size={20} /></button>
              </div>
              <div className="admin-dash__modal-body">
                {/* File picker — preview after selection */}
                <div className="admin-dash__field">
                  <label>File</label>
                  <input
                    type="file"
                    id="media-upload"
                    className="admin-dash__file-input"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                  />
                  {mediaUploadPreview && (
                    <div className="admin-media__upload-preview">
                      <img src={mediaUploadPreview} alt="preview" />
                    </div>
                  )}
                  {!mediaUploadPreview && (
                    <div className="admin-media__upload-hint">
                      <Upload size={20} aria-hidden="true" />
                      <span>Pick one or more images / videos to begin</span>
                    </div>
                  )}
                </div>

                <div className="admin-dash__field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={mediaUploadTitle}
                    onChange={(e) => setMediaUploadTitle(e.target.value)}
                    placeholder={mediaUploadTitle ? 'Auto from filename — edit if you like' : 'Auto from filename'}
                    maxLength={200}
                  />
                </div>

                <div className="admin-dash__field">
                  <label>Tags <span className="admin-dash__req">required</span></label>
                  <input
                    type="text"
                    value={mediaUploadTags}
                    onChange={(e) => setMediaUploadTags(e.target.value)}
                    placeholder="opening, keynote, 2026"
                    required
                  />
                </div>

                <div className="admin-dash__field">
                  <label>Description <span className="admin-dash__opt">optional</span></label>
                  <textarea
                    value={mediaUploadDesc}
                    onChange={(e) => setMediaUploadDesc(e.target.value)}
                    placeholder="Optional — what does this image show?"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                <div className="admin-dash__field">
                  <label>Folder</label>
                  <input
                    type="text"
                    value={mediaEventTag}
                    onChange={(e) => setMediaEventTag(e.target.value)}
                    placeholder="e.g. SIH 2026, Workshops, General"
                    list="media-folder-suggestions"
                  />
                  <datalist id="media-folder-suggestions">
                    {folders.map((f) => <option key={f} value={f} />)}
                  </datalist>
                </div>

                <label className="admin-media__upload-fav">
                  <input
                    type="checkbox"
                    checked={mediaUploadFavorite}
                    onChange={(e) => setMediaUploadFavorite(e.target.checked)}
                  />
                  <Star size={14} aria-hidden="true" />
                  Mark as favorite (will appear on landing page)
                </label>

                {error && <p className="profile-projects-error" role="alert">{error}</p>}

                <div className="admin-dash__modal-actions">
                  <button type="button" className="admin-dash__cancel-btn" onClick={cancelUpload}>Cancel</button>
                  <button
                    type="button"
                    className="admin-dash__save-btn"
                    onClick={performUpload}
                    disabled={mediaUploading || !mediaUploadPreview}
                  >
                    {mediaUploading ? 'Uploading…' : (<><Upload size={14} /> Upload</>)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit media meta (title/description) */}
        {editingMediaMeta && (
          <div className="admin-dash__modal" onClick={() => setEditingMediaMeta(null)}>
            <div className="admin-dash__modal-inner" onClick={(e) => e.stopPropagation()}>
              <div className="admin-dash__modal-header">
                <h2>Edit media</h2>
                <button className="admin-dash__modal-close" onClick={() => setEditingMediaMeta(null)} aria-label="Close"><X size={18} /></button>
              </div>
              <div className="admin-dash__modal-body">
                <div className="admin-dash__field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editingMediaMeta.title}
                    onChange={(e) => setEditingMediaMeta({ ...editingMediaMeta, title: e.target.value })}
                    placeholder="e.g. Opening keynote — KLForge launch"
                    maxLength={200}
                    autoFocus
                  />
                </div>
                <div className="admin-dash__field">
                  <label>Description</label>
                  <textarea
                    value={editingMediaMeta.description}
                    onChange={(e) => setEditingMediaMeta({ ...editingMediaMeta, description: e.target.value })}
                    placeholder="Optional — what does this image show?"
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                {error && <p className="profile-projects-error" role="alert">{error}</p>}
                <div className="admin-dash__modal-actions">
                  <button type="button" className="admin-dash__cancel-btn" onClick={() => setEditingMediaMeta(null)}>Cancel</button>
                  <button
                    type="button"
                    className="admin-dash__save-btn"
                    onClick={() => updateMediaMeta(editingMediaMeta.id, { title: editingMediaMeta.title.trim(), description: editingMediaMeta.description.trim() })}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxMedia && (
          <MediaLightbox
            item={lightboxMedia}
            onClose={() => setLightboxMedia(null)}
            onShare={() => copyShareLink(lightboxMedia)}
            onEdit={() => { const m = lightboxMedia; setLightboxMedia(null); setEditingMediaMeta({ id: m._id || m.id, title: m.title || '', description: m.description || '' }); }}
            onToggleFavorite={() => toggleFavorite(lightboxMedia)}
            onMove={() => setMoveTarget({ ids: [lightboxMedia._id || lightboxMedia.id], current: lightboxMedia.folder || lightboxMedia.eventName })}
            onDelete={() => { setMediaDeleteConfirm(lightboxMedia._id || lightboxMedia.id); setLightboxMedia(null); }}
          />
        )}

        {/* Move-to modal */}
        {moveTarget && (
          <MoveMediaModal
            target={moveTarget}
            folders={folders}
            onCancel={() => setMoveTarget(null)}
            onConfirm={(folder) => {
              if (moveTarget.ids.length === 1) {
                moveOne({ _id: moveTarget.ids[0] }, folder);
              } else {
                bulkMove(folder);
              }
            }}
          />
        )}
      </>
    );
  };

  // ── Lightbox ───────────────────────────────────────────
  function MediaLightbox({ item, onClose, onShare, onEdit, onToggleFavorite, onMove, onDelete }) {
    if (!item) return null;
    const url = item.url;
    return (
      <div className="admin-media__lightbox" onClick={onClose}>
        <div className="admin-media__lightbox-inner" onClick={(e) => e.stopPropagation()}>
          <button className="admin-media__lightbox-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
          <div className="admin-media__lightbox-asset">
            {item.type === 'video' ? (
              <video src={url} controls autoPlay />
            ) : (
              <img src={url} alt={item.title || item.folder || 'media'} />
            )}
          </div>
          <aside className="admin-media__lightbox-meta">
            <h3>{item.title || item.folder || 'Untitled'}</h3>
            {item.description && <p className="admin-media__lightbox-desc">{item.description}</p>}
            <dl className="admin-media__lightbox-dl">
              <dt>Folder</dt><dd>{item.folder || item.eventName || 'General'}</dd>
              <dt>Type</dt><dd>{item.type}</dd>
              <dt>Size</dt><dd>{item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'}</dd>
              {item.width && item.height && (<><dt>Dimensions</dt><dd>{item.width} × {item.height}</dd></>)}
              <dt>Uploaded</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd>
              {item.uploadedBy && (<><dt>By</dt><dd>{item.uploadedBy}</dd></>)}
              <dt>URL</dt><dd className="admin-media__lightbox-url">{url}</dd>
            </dl>
            <div className="admin-media__lightbox-actions">
              <button className="admin-media__lightbox-btn" onClick={onEdit}>
                <Edit3 size={14} /> Edit
              </button>
              <button className="admin-media__lightbox-btn" onClick={onShare}>
                <Share2 size={14} /> Copy link
              </button>
              <button className={`admin-media__lightbox-btn ${item.favorite ? 'admin-media__lightbox-btn--fav' : ''}`} onClick={onToggleFavorite} aria-pressed={!!item.favorite}>
                <Star size={14} fill={item.favorite ? '#ffd86b' : 'none'} /> {item.favorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <button className="admin-media__lightbox-btn" onClick={onMove}>
                <FolderInput size={14} /> Move
              </button>
              <button className="admin-media__lightbox-btn admin-media__lightbox-btn--danger" onClick={onDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── Move-to modal ──────────────────────────────────────
  function MoveMediaModal({ target, folders, onCancel, onConfirm }) {
    const [picked, setPicked] = useState(target.current || 'General');
    const [newFolder, setNewFolder] = useState('');
    return (
      <div className="admin-dash__overlay" onClick={onCancel}>
        <div className="admin-dash__modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
          <div className="admin-dash__modal-header">
            <h2>Move {target.ids.length > 1 ? `${target.ids.length} items` : 'item'}</h2>
            <button className="admin-dash__close-btn" onClick={onCancel}><X size={20} /></button>
          </div>
          <div className="admin-dash__modal-body">
            <div className="admin-dash__field">
              <label>Pick an existing folder</label>
              <select value={picked} onChange={(e) => { setPicked(e.target.value); setNewFolder(''); }}>
                {folders.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="admin-dash__field">
              <label>Or create a new one</label>
              <input
                type="text"
                value={newFolder}
                onChange={(e) => { setNewFolder(e.target.value); if (e.target.value) setPicked(''); }}
                placeholder="e.g. SIH 2026"
              />
            </div>
            <div className="admin-dash__modal-actions">
              <button className="admin-dash__cancel-btn" onClick={onCancel}>Cancel</button>
              <button
                className="admin-dash__save-btn"
                onClick={() => onConfirm(newFolder.trim() || picked)}
                disabled={!newFolder.trim() && !picked}
              >
                <FolderInput size={14} /> Move
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPlaceholderSection = (title, description, icon) => (
    <div className="admin-section__placeholder">
      <div className="admin-section__placeholder-icon">{icon}</div>
      <h2 className="admin-section__placeholder-title">{title}</h2>
      <p className="admin-section__placeholder-desc">{description}</p>
      <div className="admin-section__placeholder-tag">Coming Soon</div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'members': return renderMembersSection();
      case 'events': return renderEventsSection();
      case 'notices': return renderNoticesSection();
      case 'projects': return renderProjectsSection();
      case 'media': return renderMediaSection();
      case 'domains': return renderPlaceholderSection('Domains', 'Define and manage club domains — Web, AI/ML, Cyber, Design, and more.', <Globe size={48} />);
      default: return renderMembersSection();
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="admin-dash">
      {/* ── Mobile sticky header (visible on mobile only) ── */}
      <header className="admin-mob-header">
        <div className="admin-mob-header__brand">
          <div className="admin-mob-header__logo">KF</div>
          <h1 className="admin-mob-header__title">{NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Dashboard'}</h1>
        </div>
        <button className="admin-mob-header__logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* ── Desktop Sidebar (hidden on mobile via CSS) ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">KF</div>
          <span className="admin-sidebar__brand-name">KLFORGE</span>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__group">
            <span className="admin-sidebar__group-label">Club</span>
            {NAV_ITEMS.filter((i) => i.id === 'members' || i.id === 'events').map((item) => (
              <button
                key={item.id}
                className={`admin-sidebar__item ${activeSection === item.id ? 'admin-sidebar__item--active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                <span className="admin-sidebar__item-icon">{item.icon}</span>
                <span className="admin-sidebar__item-label">{item.label}</span>
                {item.count !== undefined && (
                  <span className="admin-sidebar__badge">{item.count}</span>
                )}
              </button>
            ))}
          </div>

          {NAV_ITEMS.some((i) => i.eliteOnly) && (
            <div className="admin-sidebar__group">
              <span className="admin-sidebar__group-label">Content</span>
              {NAV_ITEMS.filter((i) => i.eliteOnly).map((item) => (
                <button
                  key={item.id}
                  className={`admin-sidebar__item ${activeSection === item.id ? 'admin-sidebar__item--active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  <span className="admin-sidebar__item-icon">{item.icon}</span>
                  <span className="admin-sidebar__item-label">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="admin-sidebar__badge">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="admin-sidebar__bottom">
          {(adminInfo.name || adminInfo.email) && (
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

      {/* ── Main content ── */}
      <main className="admin-main">
        <header className="admin-main__topbar" style={{ display: 'none' }}>
          <h1 className="admin-main__title">{NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Dashboard'}</h1>
          <div className="admin-main__topbar-right">
            <div className="admin-main__status-dot" />
            <span className="admin-main__status-text">Admin</span>
          </div>
        </header>
        <div className="admin-main__content" data-lenis-prevent="true">{renderActiveSection()}</div>
      </main>

      {/* ── Mobile floating dock (hidden on desktop via CSS) ── */}
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

      {/* ── Member Modal ─────────────────────────────────── */}
      <MemberEditModal
        open={showMemberForm}
        member={memberEditing}
        domainsList={domainsList}
        actor={adminInfo}
        saving={memberSaving}
        onClose={closeMemberForm}
        onSubmit={handleMemberSubmit}
      />

      {/* ── Event Modal ──────────────────────────────────── */}
      {showEventForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={closeEventForm}>
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleEventSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{eventEditing ? 'Edit Event' : 'Add New Event'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={closeEventForm}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Title *</label><input required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Description</label><textarea rows="3" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="What's this event about?" /></div>
              <div className="admin-dash__field"><label>Event Type</label><input value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} placeholder="e.g. Workshop, Seminar" /></div>
              <div className="admin-dash__field"><label>Points</label><input type="number" value={eventForm.points} onChange={e => setEventForm({ ...eventForm, points: Number(e.target.value) })} /></div>
              <div className="admin-dash__field"><label>Slots</label><input type="number" value={eventForm.slots} onChange={e => setEventForm({ ...eventForm, slots: Number(e.target.value) })} /></div>

              <div className="admin-dash__field">
                <label>Start Time *</label>
                <ModernDateTimePicker value={eventForm.startTime} onChange={val => setEventForm({ ...eventForm, startTime: val })} placeholder="Select Start Time" />
              </div>
              <div className="admin-dash__field">
                <label>End Time *</label>
                <ModernDateTimePicker value={eventForm.endTime} onChange={val => setEventForm({ ...eventForm, endTime: val })} placeholder="Select End Time" />
              </div>
              <div className="admin-dash__field">
                <label>Registration Deadline</label>
                <ModernDateTimePicker value={eventForm.registrationDeadline} onChange={val => setEventForm({ ...eventForm, registrationDeadline: val })} placeholder="Select Deadline" />
              </div>

              <div className="admin-dash__field admin-dash__field--full admin-dash__field--divider"><label className="admin-dash__field-section-label">Advanced Access Control</label></div>
              
              <div className="admin-dash__field">
                <label>Access Level *</label>
                <select value={eventForm.accessType} onChange={e => setEventForm({ ...eventForm, accessType: e.target.value })}>
                  <option value="public">Public (All Forge Members)</option>
                  <option value="domain">Domain Specific (Selected Domains)</option>
                  <option value="private">Private (Specific Guest List)</option>
                </select>
              </div>

              {eventForm.accessType === 'domain' && (
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Allowed Domains</label>
                  <div className="admin-dash__picker">
                    {['Protocol & Operations', 'Creative & Content', 'Media & Broadcasting', 'Public Speaking', 'Tech & Innovation', 'General'].map(d => (
                      <div 
                        key={d} 
                        className={`admin-dash__chip ${eventForm.allowedDomains.includes(d) ? 'admin-dash__chip--active' : ''}`}
                        onClick={() => {
                          const next = eventForm.allowedDomains.includes(d)
                            ? eventForm.allowedDomains.filter(item => item !== d)
                            : [...eventForm.allowedDomains, d];
                          setEventForm({ ...eventForm, allowedDomains: next });
                        }}
                      >
                        {d}
                        {eventForm.allowedDomains.includes(d) && <CheckCircle size={12} style={{ marginLeft: 6 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eventForm.accessType === 'private' && (
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Allowed Members (Guest List)</label>
                  <div className="admin-dash__search-picker">
                    <input 
                      placeholder="Search member... (Name or Roll Number)" 
                      value={memberSearchQuery}
                      onChange={e => {
                        setMemberSearchQuery(e.target.value);
                        setShowMemberSearchResults(true);
                      }}
                      onFocus={() => setShowMemberSearchResults(true)}
                    />
                    {showMemberSearchResults && memberSearchQuery.trim() && (
                      <div className="admin-dash__search-results">
                        {members
                          .filter(m => 
                            !eventForm.allowedMembers.includes(Number(m.rollNumber)) &&
                            (m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                             String(m.rollNumber).toLowerCase().includes(memberSearchQuery.toLowerCase()))
                          )
                          .slice(0, 10)
                          .map(m => (
                            <div key={m.id} className="admin-dash__search-item" onClick={() => {
                              setEventForm({ ...eventForm, allowedMembers: [...eventForm.allowedMembers, Number(m.rollNumber)] });
                              setMemberSearchQuery('');
                              setShowMemberSearchResults(false);
                            }}>
                              <img src={m.photoUrl || 'https://via.placeholder.com/150'} className="admin-dash__search-avatar" alt="" />
                              <div className="admin-dash__search-info">
                                <span className="admin-dash__search-name">{m.name}</span>
                                <span className="admin-dash__search-meta">{m.rollNumber} • {m.domain}</span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <div className="admin-dash__picker">
                    {eventForm.allowedMembers.map(roll => {
                      const m = members.find(mem => Number(mem.rollNumber) === Number(roll));
                      return (
                        <div key={roll} className="admin-dash__chip admin-dash__chip--active" title={`Roll: ${roll}`} onClick={() => {
                          setEventForm({ ...eventForm, allowedMembers: eventForm.allowedMembers.filter(r => Number(r) !== Number(roll)) });
                        }}>
                          {m ? m.name : roll} <span style={{ marginLeft: 6, opacity: 0.5 }}>✕</span>
                        </div>
                      );
                    })}
                    {eventForm.allowedMembers.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>Guest list is empty. Search above.</span>}
                  </div>
                </div>
              )}

              <div className="admin-dash__field admin-dash__field--full">
                <label>Available Roles (comma-separated)</label>
                <input 
                  value={Array.isArray(eventForm.roles) ? eventForm.roles.join(', ') : ''} 
                  onChange={e => setEventForm({ ...eventForm, roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean) })}
                  placeholder="Participant, Volunteer, Organizer"
                />
              </div>

              <div className="admin-dash__field">
                <label>Registration Status</label>
                <select value={eventForm.isRegistrationOpen ? 'open' : 'closed'} onChange={e => setEventForm({ ...eventForm, isRegistrationOpen: e.target.value === 'open' })}>
                  <option value="open">Open (Ready for sign-ups)</option>
                  <option value="closed">Closed (Manual Only)</option>
                </select>
              </div>
              <div className="admin-dash__field admin-dash__field--full"><label>Venue</label><input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="e.g. A Block Seminar Hall" /></div>
              <div className="admin-dash__field admin-dash__field--full admin-dash__field--divider"><label className="admin-dash__field-section-label">Poster Image</label></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Upload Poster (JPEG/PNG/WebP, max 5MB)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEventPosterChange} /></div>
              {eventPosterPreview && (
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Crop Poster</label>
                  <div className="admin-dash__crop-area">
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                      <img src={eventPosterPreview} alt="Poster preview" onLoad={onImageLoad} className="admin-dash__crop-img" />
                    </ReactCrop>
                  </div>
                </div>
              )}
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={closeEventForm}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={eventSaving}>{eventSaving ? 'Saving...' : eventEditing ? 'Update Event' : 'Add Event'}</button>
            </div>
          </form>
        </div>
      )}


      {showNoticeForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={closeNoticeForm}>
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleNoticeSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{noticeEditing ? 'Edit Notice' : 'Add Notice'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={closeNoticeForm}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Title *</label><input required value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="Notice title" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Message *</label><textarea required rows="4" value={noticeForm.message} onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })} placeholder="Notice details..." /></div>
              <div className="admin-dash__field"><label>Priority</label><select value={noticeForm.priority} onChange={e => setNoticeForm({ ...noticeForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={closeNoticeForm}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={noticeSaving}>{noticeSaving ? 'Saving...' : noticeEditing ? 'Update Notice' : 'Post Notice'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Project Modal ────────────────────────────────── */}
      {showProjectForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={closeProjectForm}>
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleProjectSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{projectEditing ? 'Edit Project' : 'Add Project'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={closeProjectForm}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Project Name *</label><input required value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Description</label><textarea rows="3" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="What does this project do?" /></div>
              <div className="admin-dash__field"><label>GitHub URL</label><input type="url" value={projectForm.github} onChange={e => setProjectForm({ ...projectForm, github: e.target.value })} placeholder="https://github.com/..." /></div>
              <div className="admin-dash__field"><label>Demo URL</label><input type="url" value={projectForm.demo} onChange={e => setProjectForm({ ...projectForm, demo: e.target.value })} placeholder="https://..." /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Technologies (comma-separated)</label><input value={projectForm.technologies} onChange={e => setProjectForm({ ...projectForm, technologies: e.target.value })} placeholder="React, Node.js, MongoDB" /></div>
              <div className="admin-dash__field admin-dash__field--full admin-dash__field--divider"><label className="admin-dash__field-section-label">Project Image</label></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Upload Image (JPEG/PNG/WebP, max 5MB)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProjectImageChange} /></div>
              {projectImagePreview && (
                <div className="admin-dash__field admin-dash__field--full">
                  <label>Crop Image</label>
                  <div className="admin-dash__crop-area">
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                      <img src={projectImagePreview} alt="Project preview" onLoad={onImageLoad} className="admin-dash__crop-img" />
                    </ReactCrop>
                  </div>
                </div>
              )}
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={closeProjectForm}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={projectSaving}>{projectSaving ? 'Saving...' : projectEditing ? 'Update Project' : 'Add Project'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Registrations Modal ────────────────────────────── */}
      {showRegsModal && selectedEventForRegs && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={() => setShowRegsModal(false)}>
          <div className="admin-dash__modal admin-dash__modal--large" onClick={e => e.stopPropagation()}>
            <div className="admin-dash__modal-header">
              <div>
                <h2>Registrations</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, marginTop: 4 }}>{selectedEventForRegs.title}</p>
              </div>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowRegsModal(false)}><X size={20} /></button>
            </div>
            
            {regsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading registrations...</div>
            ) : (
              <div className="admin-dash__table-wrap" style={{ marginTop: 20, maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="admin-dash__table">
                  <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 10 }}>
                    <tr>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegs.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 20 }}>No one has registered yet.</td></tr>
                    ) : eventRegs.map(reg => (
                      <tr key={reg.id}>
                        <td>{reg.name}</td>
                        <td className="admin-dash__mono">{reg.rollNumber}</td>
                        <td style={{ color: 'rgba(255,255,255,0.6)' }}>{reg.email.replace('@kluniversity.in', '')}</td>
                        <td>
                          <select 
                            value={reg.role || 'Participant'} 
                            onChange={(e) => updateMemberRole(reg.id, e.target.value)}
                            style={{ 
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', 
                              color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', outline: 'none' 
                            }}
                          >
                            <option value="Participant">Participant</option>
                            <option value="Volunteer">Volunteer</option>
                            <option value="Organizer">Organizer</option>
                          </select>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="admin-dash__modal-actions" style={{ marginTop: 24 }}>
              <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowRegsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
