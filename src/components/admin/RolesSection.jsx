'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Edit3, Trash2, Check, RefreshCw, X, Users, Lock, ChevronDown, ChevronUp, Sparkles, CheckSquare, Square
} from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

const COLOR_PALETTE = [
  '#f59e0b', // Amber / Gold
  '#38bdf8', // Cyan
  '#c084fc', // Purple
  '#34d399', // Emerald
  '#fb7185', // Rose
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export default function RolesSection() {
  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // null for create
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleColor, setRoleColor] = useState('#71C4FF');
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Group collapse toggle in modal
  const [expandedGroups, setExpandedGroups] = useState({});

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        setPermissionGroups(data.permissionGroups || []);
        // Expand all permission groups by default
        const initExpanded = {};
        (data.permissionGroups || []).forEach(g => {
          initExpanded[g.category] = true;
        });
        setExpandedGroups(initExpanded);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch roles & permissions catalog');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setRoleColor('#38bdf8');
    setSelectedPermissions(new Set());
    setShowModal(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setRoleColor(role.color || '#71C4FF');
    setSelectedPermissions(new Set(role.permissions || []));
    setShowModal(true);
  };

  const togglePermission = (permId) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleGroupAll = (group) => {
    const groupPermIds = group.permissions.map(p => p.id);
    const allSelected = groupPermIds.every(id => selectedPermissions.has(id));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (allSelected) {
        groupPermIds.forEach(id => next.delete(id));
      } else {
        groupPermIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleGroupExpand = (cat) => {
    setExpandedGroups(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: roleName.trim(),
        description: roleDesc.trim(),
        color: roleColor,
        permissions: Array.from(selectedPermissions),
      };

      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(editingRole ? 'Role permissions updated!' : 'Custom role created successfully!');
        setShowModal(false);
        fetchRoles();
      } else {
        setError(data.error || 'Failed to save role');
      }
    } catch (err) {
      setError(err.message || 'Error saving role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem) {
      alert('Built-in system roles cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Role "${role.name}" deleted.`);
        fetchRoles();
      } else {
        setError(data.error || 'Failed to delete role');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPermsCount = permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0);

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

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck color="#38bdf8" size={26} /> Roles & Permissions Manager
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Define custom roles with super-granular micro-permissions and assign them to user profiles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchRoles}
            className="btn btn--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 16px', borderRadius: 10, cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#38bdf8', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 16px rgba(56,189,248,0.3)' }}
          >
            <Plus size={18} /> Create Custom Role
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 16px', borderRadius: 10, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Roles Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
          Loading security roles & permissions...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {roles.map((role) => (
            <div
              key={role.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${role.color ? role.color + '40' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                boxShadow: `0 8px 30px rgba(0, 0, 0, 0.3)`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      background: role.color ? role.color + '20' : 'rgba(113,196,255,0.15)',
                      border: `1px solid ${role.color ? role.color + '60' : 'rgba(113,196,255,0.4)'}`,
                      color: role.color || '#71C4FF',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        SYSTEM
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    <Users size={14} /> {role.memberCount} {role.memberCount === 1 ? 'User' : 'Users'}
                  </div>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {role.description || 'No description provided.'}
                </p>

                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
                    <span>Granular Permissions Granted</span>
                    <span style={{ color: role.color || '#38bdf8', fontWeight: 800 }}>
                      {role.permissions?.length || 0} / {totalPermsCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 90, overflowY: 'auto' }}>
                    {(role.permissions || []).slice(0, 8).map(perm => (
                      <span key={perm} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                        {perm}
                      </span>
                    ))}
                    {(role.permissions || []).length > 8 && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', padding: '2px 4px' }}>
                        +{(role.permissions || []).length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => openEditModal(role)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  <Edit3 size={14} /> Edit Permissions
                </button>

                {!role.isSystem && (
                  <button
                    onClick={() => handleDeleteRole(role)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
                    title="Delete Role"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#09090f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, maxWidth: 'min(1280px, 94vw)', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.9)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck color={roleColor} size={22} /> {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                  Select granular micro-permissions to grant to users assigned to this role.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <form onSubmit={handleFormSubmit} style={{ overflowY: 'auto', padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 700 }}>Role Name *</label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Event Manager, Media Lead"
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 700 }}>Description</label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="Describe the responsibilities and access granted by this role..."
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 700 }}>Badge Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 42 }}>
                    {COLOR_PALETTE.map(c => (
                      <div
                        key={c}
                        onClick={() => setRoleColor(c)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                          border: roleColor === c ? '2px solid #fff' : '2px solid transparent',
                          transform: roleColor === c ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* GRANULAR PERMISSIONS SELECTOR BY MODULE */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={15} color="#38bdf8" /> Granular Permissions ({selectedPermissions.size} Selected)
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {permissionGroups.map(group => {
                    const groupPermIds = group.permissions.map(p => p.id);
                    const selectedInGroupCount = groupPermIds.filter(id => selectedPermissions.has(id)).length;
                    const isAllSelected = selectedInGroupCount === groupPermIds.length;
                    const isExpanded = expandedGroups[group.category];

                    return (
                      <div key={group.category} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Group Header */}
                        <div
                          style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => toggleGroupExpand(group.category)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.5)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{group.category}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{group.description}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedInGroupCount > 0 ? '#38bdf8' : 'rgba(255,255,255,0.3)' }}>
                              {selectedInGroupCount} / {groupPermIds.length}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleGroupAll(group); }}
                              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '0.72rem', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                            >
                              {isAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        </div>

                        {/* Individual Micro-Permissions List */}
                        {isExpanded && (
                          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {group.permissions.map(perm => {
                              const checked = selectedPermissions.has(perm.id);
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => togglePermission(perm.id)}
                                  style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10,
                                    borderRadius: 8, background: checked ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${checked ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.04)'}`,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ marginTop: 2, color: checked ? '#38bdf8' : 'rgba(255,255,255,0.3)' }}>
                                    {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: checked ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                                      {perm.label}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, marginTop: 2 }}>
                                      {perm.description}
                                    </div>
                                    <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 3 }}>
                                      {perm.id}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Action Footer */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: '#38bdf8', color: '#000', fontWeight: 800, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(56,189,248,0.3)' }}
                >
                  {saving ? 'Saving Role...' : editingRole ? 'Save Permission Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
