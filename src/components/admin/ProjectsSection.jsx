'use client';

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, FolderKanban, X } from 'lucide-react';
import projectService from '../../../src/services/projectService';
import '../../../app/admin/dashboard/AdminDashboard.css';

const EMPTY_PROJECT_FORM = { name: '', description: '', github: '', demo: '', technologies: '' };

export default function ProjectsSection({ projects, adminInfo, refreshData }) {
  const userPerms = Array.isArray(adminInfo?.permissions) ? adminInfo.permissions : [];
  const isElite = adminInfo?.isElite || false;

  const canCreateProject = isElite || userPerms.includes('projects.create');
  const canEditProject = isElite || userPerms.includes('projects.edit');
  const canDeleteProject = isElite || userPerms.includes('projects.delete');

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectEditing, setProjectEditing] = useState(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  const openAddProject = () => {
    if (!canCreateProject) return;
    setProjectEditing(null);
    setProjectForm(EMPTY_PROJECT_FORM);
    setShowProjectForm(true);
  };

  const openEditProject = (p) => {
    if (!canEditProject) return;
    setProjectEditing(p);
    setProjectForm({
      name: p.name || '',
      description: p.description || '',
      github: p.github || '',
      demo: p.demo || '',
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
    });
    setShowProjectForm(true);
  };

  const handleProjectDelete = async (id) => {
    if (!canDeleteProject) return;
    try {
      await projectService.delete(id);
      setProjectDeleteConfirm(null);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setProjectSaving(true);
    setError('');

    const payload = {
      ...projectForm,
      technologies: projectForm.technologies ? projectForm.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    try {
      if (projectEditing) {
        await projectService.update(projectEditing.id, payload);
      } else {
        await projectService.create(payload);
      }

      setShowProjectForm(false);
      if (refreshData) refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setProjectSaving(false);
    }
  };

  return (
    <>
      <div className="admin-section__header">
        <div>
          <h2 className="admin-section__title admin-section__title--large">Projects Showcase</h2>
          <p className="admin-section__subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateProject && (
          <button className="admin-dash__add-btn" onClick={openAddProject}><Plus size={18} /> Add Project</button>
        )}
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
                    {Array.isArray(p.technologies) && p.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="admin-dash__tech-tag">{t}</span>
                    ))}
                    {Array.isArray(p.technologies) && p.technologies.length > 4 && <span className="admin-dash__tech-tag">+{p.technologies.length - 4}</span>}
                  </div>
                </td>
                <td>
                  {p.github ? <a href={p.github} target="_blank" rel="noopener noreferrer" className="admin-dash__link">GitHub ↗</a> : '—'}
                </td>
                <td className="admin-dash__actions-cell">
                  {canEditProject && (
                    <button className="admin-dash__icon-btn admin-dash__icon-btn--edit" aria-label={`Edit project ${p.name}`} onClick={() => openEditProject(p)}><Edit3 size={15} aria-hidden="true" /></button>
                  )}
                  {canDeleteProject && (
                    projectDeleteConfirm === p.id ? (
                      <span className="admin-dash__delete-confirm">Sure?
                        <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" onClick={() => handleProjectDelete(p.id)}>Yes</button>
                        <button className="admin-dash__icon-btn" onClick={() => setProjectDeleteConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <button className="admin-dash__icon-btn admin-dash__icon-btn--danger" aria-label={`Delete project ${p.name}`} onClick={() => setProjectDeleteConfirm(p.id)}><Trash2 size={15} aria-hidden="true" /></button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && <div className="admin-dash__empty">No projects yet.</div>}
      </div>

      {/* Mobile cards */}
      <div className="admin-mob-cards">
        {projects.length === 0 && <div className="admin-dash__empty">No projects yet.</div>}
        {projects.map((p) => (
          <div key={p.id} className="admin-mob-card">
            <div className="admin-mob-card__top">
              <div className="admin-mob-card__avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(125,190,255,0.08)', color:'rgba(125,190,255,0.5)' }}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'10px' }} /> : <FolderKanban size={20} />}
              </div>
              <div className="admin-mob-card__info">
                <div className="admin-mob-card__name">{p.name}</div>
                {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="admin-dash__link" style={{ fontSize:'0.75rem' }}>GitHub ↗</a>}
              </div>
            </div>
            {p.description && <div className="admin-mob-card__desc">{p.description}</div>}
            {Array.isArray(p.technologies) && p.technologies.length > 0 && (
              <div className="admin-mob-card__chips">
                {p.technologies.map(t => <span key={t} className="admin-dash__tech-tag">{t}</span>)}
              </div>
            )}
            {canDeleteProject && projectDeleteConfirm === p.id ? (
              <div className="admin-mob-card__confirm">
                <span className="admin-mob-card__confirm-label">Delete this project?</span>
                <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => handleProjectDelete(p.id)}>Yes, Delete</button>
                <button className="admin-mob-btn" onClick={() => setProjectDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <div className="admin-mob-card__actions">
                {canEditProject && <button className="admin-mob-btn admin-mob-btn--edit" onClick={() => openEditProject(p)}><Edit3 size={15} /> Edit</button>}
                {canDeleteProject && <button className="admin-mob-btn admin-mob-btn--delete" onClick={() => setProjectDeleteConfirm(p.id)}><Trash2 size={15} /> Delete</button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Project Modal */}
      {showProjectForm && (
        <div className="admin-dash__overlay" data-lenis-prevent="true" onClick={() => setShowProjectForm(false)}>
          <form className="admin-dash__modal" onClick={e => e.stopPropagation()} onSubmit={handleProjectSubmit}>
            <div className="admin-dash__modal-header">
              <h2>{projectEditing ? 'Edit Project' : 'Add Project'}</h2>
              <button type="button" className="admin-dash__close-btn" onClick={() => setShowProjectForm(false)}><X size={20} /></button>
            </div>
            {error && <div className="admin-dash__error">{error}</div>}
            <div className="admin-dash__form-grid">
              <div className="admin-dash__field admin-dash__field--full"><label>Project Name *</label><input required value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Description</label><textarea rows="3" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="What does this project do?" /></div>
              <div className="admin-dash__field"><label>GitHub URL</label><input type="url" value={projectForm.github} onChange={e => setProjectForm({ ...projectForm, github: e.target.value })} placeholder="https://github.com/..." /></div>
              <div className="admin-dash__field"><label>Demo URL</label><input type="url" value={projectForm.demo} onChange={e => setProjectForm({ ...projectForm, demo: e.target.value })} placeholder="https://..." /></div>
              <div className="admin-dash__field admin-dash__field--full"><label>Technologies (comma-separated)</label><input value={projectForm.technologies} onChange={e => setProjectForm({ ...projectForm, technologies: e.target.value })} placeholder="React, Node.js, MongoDB" /></div>
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__cancel-btn" onClick={() => setShowProjectForm(false)}>Cancel</button>
              <button type="submit" className="admin-dash__save-btn" disabled={projectSaving}>{projectSaving ? 'Saving...' : projectEditing ? 'Update Project' : 'Add Project'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
