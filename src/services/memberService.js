const API_BASE = '/api';

// ── Utilities ────────────────────────────────────────────

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

// ── Helpers ──────────────────────────────────────────────

// Canonical slug resolver used both client-side and server-side.
// A member's URL slug is always the local-part of their @kluniversity.in email
// (or the roll number when no email exists). Keep this in sync with lib/slug.js.
function memberSlugLocal({ email, rollNumber, id }) {
  const e = (email || '').split('@')[0].trim();
  if (e) return e;
  if (rollNumber) return String(rollNumber).trim();
  if (id) return String(id).trim();
  return '';
}

export const nameToSlug = (name) => {
  if (!name) return '';
  // Legacy helper kept for any caller that still needs a *name*-derived slug
  // (we just don't use it as the primary lookup key anymore).
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length === 1) return parts[0].replace(/[^a-z0-9]/g, '');
  return (parts[0] + parts[1]).replace(/[^a-z0-9]/g, '');
};

export const getAvatarUrl = (member) => {
  if (member.photoUrl) return member.photoUrl;
  const colorHex = (member.color && member.color.startsWith('#')) ? member.color.replace('#', '') : '71C4FF';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=400&background=1a1a2e&color=${colorHex}`;
};

export const toTeamCards = (members) =>
  members.map((m) => ({
    name: m.name,
    role: `${m.role}  •  ${m.rollNumber}`,
    description: m.description,
    profileLink: `/${m.id}`,
    color: m.color || '#71C4FF',
  }));

export const findBySlug = (members, slug) => {
  if (!slug) return null;
  const target = String(slug).toLowerCase();
  return (
    members.find((m) => {
      if (m.id === slug) return true;
      if (m.rollNumber && String(m.rollNumber) === slug) return true;
      const ml = memberSlugLocal(m);
      if (ml && ml.toLowerCase() === target) return true;
      // Fallback for legacy rows whose id differs from the email local-part.
      if (m.email && m.email.split('@')[0].toLowerCase() === target) return true;
      return false;
    }) || null
  );
};

// ── API ──────────────────────────────────────────────────

const memberService = {
  async getAll() {
    const res = await fetch(`${API_BASE}/members`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load members');
    const data = await safeJson(res);
    if (!Array.isArray(data)) throw new Error('Failed to load members');
    return data.map((m) => ({ ...m, avatarUrl: getAvatarUrl(m) }));
  },

  async add(formData) {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to add member');
    }
    return safeJson(res);
  },

  async update(id, formData) {
    const res = await fetch(`${API_BASE}/members/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to update member');
    }
    return safeJson(res);
  },

  async remove(id) {
    const res = await fetch(`${API_BASE}/members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data.error || 'Failed to delete member');
    }
    return safeJson(res);
  },

  async reorder(order) {
    const res = await fetch(`${API_BASE}/members/reorder/list`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order }),
    });
    if (!res.ok) throw new Error('Failed to reorder');
    return safeJson(res);
  },
};

export default memberService;
