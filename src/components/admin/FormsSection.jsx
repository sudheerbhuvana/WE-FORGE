'use client';
import React, { useState, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Eye, EyeOff, Copy, ExternalLink,
  GripVertical, ChevronDown, ChevronUp, Settings, List,
  ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
  FileText, Users, Calendar, Hash, Type, Mail, Phone,
  Link2, AlignLeft, ChevronRight, Download, X, Save
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text',     label: 'Short Text',  icon: <Type size={14} /> },
  { value: 'textarea', label: 'Long Text',   icon: <AlignLeft size={14} /> },
  { value: 'email',    label: 'Email',       icon: <Mail size={14} /> },
  { value: 'phone',    label: 'Phone',       icon: <Phone size={14} /> },
  { value: 'number',   label: 'Number',      icon: <Hash size={14} /> },
  { value: 'url',      label: 'URL / Link',  icon: <Link2 size={14} /> },
  { value: 'select',   label: 'Dropdown',    icon: <ChevronDown size={14} /> },
  { value: 'radio',    label: 'Radio',       icon: <List size={14} /> },
  { value: 'checkbox', label: 'Checkboxes',  icon: <CheckCircle2 size={14} /> },
  { value: 'date',     label: 'Date',        icon: <Calendar size={14} /> },
];

const genId = () => `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function FieldEditor({ field, onChange, onDelete, onMove, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(true);
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  const update = (key, val) => onChange({ ...field, [key]: val });

  const addOption = () => update('options', [...(field.options || []), '']);
  const updateOption = (i, val) => {
    const opts = [...(field.options || [])];
    opts[i] = val;
    update('options', opts);
  };
  const removeOption = (i) => update('options', (field.options || []).filter((_, idx) => idx !== i));

  return (
    <div className="fm-field-card">
      <div className="fm-field-card__header" onClick={() => setExpanded(e => !e)}>
        <div className="fm-field-card__drag"><GripVertical size={16} /></div>
        <div className="fm-field-card__meta">
          <span className="fm-field-type-badge">{FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}</span>
          <span className="fm-field-label-preview">{field.label || <em style={{opacity:0.4}}>Untitled Field</em>}</span>
          {field.required && <span className="fm-req-dot">*</span>}
        </div>
        <div className="fm-field-card__actions" onClick={e => e.stopPropagation()}>
          <button type="button" className="fm-icon-btn" onClick={() => onMove(-1)} disabled={isFirst} title="Move up"><ChevronUp size={14}/></button>
          <button type="button" className="fm-icon-btn" onClick={() => onMove(1)} disabled={isLast} title="Move down"><ChevronDown size={14}/></button>
          <button type="button" className="fm-icon-btn fm-icon-btn--danger" onClick={onDelete} title="Delete field"><Trash2 size={14}/></button>
          <button type="button" className="fm-icon-btn">{expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
        </div>
      </div>

      {expanded && (
        <div className="fm-field-card__body">
          <div className="fm-grid-2">
            <div className="fm-form-group">
              <label>Field Label <span className="fm-req">*</span></label>
              <input className="fm-input" value={field.label} onChange={e => update('label', e.target.value)} placeholder="e.g. Full Name" />
            </div>
            <div className="fm-form-group">
              <label>Field Type</label>
              <select className="fm-input" value={field.type} onChange={e => update('type', e.target.value)}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="fm-form-group">
            <label>Placeholder / Helper Text</label>
            <input className="fm-input" value={field.placeholder} onChange={e => update('placeholder', e.target.value)} placeholder="e.g. Enter your full name..." />
          </div>

          {field.helpText !== undefined && (
            <div className="fm-form-group">
              <label>Help Text (shown below field)</label>
              <input className="fm-input" value={field.helpText} onChange={e => update('helpText', e.target.value)} placeholder="e.g. Use your university email" />
            </div>
          )}

          {hasOptions && (
            <div className="fm-form-group">
              <label>Options</label>
              <div className="fm-options-list">
                {(field.options || []).map((opt, i) => (
                  <div key={i} className="fm-option-row">
                    <input className="fm-input" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    <button type="button" className="fm-icon-btn fm-icon-btn--danger" onClick={() => removeOption(i)}><X size={13}/></button>
                  </div>
                ))}
                <button type="button" className="fm-add-option-btn" onClick={addOption}><Plus size={13}/> Add Option</button>
              </div>
            </div>
          )}

          <div className="fm-grid-3">
            {(field.type === 'text' || field.type === 'textarea') && (
              <>
                <div className="fm-form-group">
                  <label>Min Length</label>
                  <input className="fm-input" type="number" min="0" value={field.minLength ?? ''} onChange={e => update('minLength', e.target.value ? parseInt(e.target.value) : null)} placeholder="—" />
                </div>
                <div className="fm-form-group">
                  <label>Max Length</label>
                  <input className="fm-input" type="number" min="0" value={field.maxLength ?? ''} onChange={e => update('maxLength', e.target.value ? parseInt(e.target.value) : null)} placeholder="—" />
                </div>
              </>
            )}
            <div className="fm-form-group fm-form-group--toggle">
              <label>Required</label>
              <button type="button" className={`fm-toggle ${field.required ? 'fm-toggle--on' : ''}`} onClick={() => update('required', !field.required)}>
                {field.required ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                <span>{field.required ? 'Yes' : 'No'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormBuilderModal({ form, onClose, onSave }) {
  const isNew = !form?._id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'settings'

  const [title, setTitle] = useState(form?.title || '');
  const [description, setDescription] = useState(form?.description || '');
  const [coverImageUrl, setCoverImageUrl] = useState(form?.coverImageUrl || '');
  const [successMessage, setSuccessMessage] = useState(form?.successMessage || 'Thank you! Your response has been recorded.');
  const [fields, setFields] = useState(form?.fields || []);
  const [isPublished, setIsPublished] = useState(form?.isPublished ?? false);
  const [requiresLogin, setRequiresLogin] = useState(form?.requiresLogin ?? false);
  const [allowMultiple, setAllowMultiple] = useState(form?.allowMultiple ?? false);
  const [maxResponses, setMaxResponses] = useState(form?.maxResponses || '');
  const [closeAt, setCloseAt] = useState(form?.closeAt ? new Date(form.closeAt).toISOString().slice(0, 16) : '');

  const addField = (type = 'text') => {
    setFields(f => [...f, { id: genId(), type, label: '', placeholder: '', required: false, options: [], minLength: null, maxLength: null, helpText: '' }]);
  };

  const updateField = (idx, updated) => setFields(f => f.map((fld, i) => i === idx ? updated : fld));
  const deleteField = (idx) => setFields(f => f.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Form title is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { title, description, coverImageUrl, successMessage, fields, isPublished, requiresLogin, allowMultiple, maxResponses: maxResponses || null, closeAt: closeAt || null };
      const url = isNew ? '/api/forms' : `/api/forms/${form._id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSave(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-dash__modal-overlay" onClick={onClose}>
      <div className="admin-dash__modal fm-modal" style={{ width: '90vw', maxWidth: 1100, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="fm-modal-header">
          <div>
            <h2 className="fm-modal-title">{isNew ? 'Create New Form' : 'Edit Form'}</h2>
            {!isNew && form?.slug && <p className="fm-modal-slug">klforge.in/forms/{form.slug}</p>}
          </div>
          <div className="fm-modal-header-actions">
            <button type="button" className={`fm-tab-btn ${activeTab === 'fields' ? 'fm-tab-btn--active' : ''}`} onClick={() => setActiveTab('fields')}>
              <FileText size={15}/> Fields
            </button>
            <button type="button" className={`fm-tab-btn ${activeTab === 'settings' ? 'fm-tab-btn--active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={15}/> Settings
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="fm-modal-body">
          {error && <div className="fm-error-bar"><AlertCircle size={15}/> {error}</div>}

          {activeTab === 'fields' && (
            <div className="fm-fields-pane">
              {/* Form Meta */}
              <div className="fm-form-group" style={{ marginBottom: 16 }}>
                <label>Form Title <span className="fm-req">*</span></label>
                <input className="fm-input fm-input--lg" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Club Feedback Survey" />
              </div>
              <div className="fm-form-group" style={{ marginBottom: 24 }}>
                <label>Description</label>
                <textarea className="fm-input fm-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description shown to respondents..." />
              </div>

              {/* Field List */}
              <div className="fm-section-label">Form Fields ({fields.length})</div>
              {fields.length === 0 && (
                <div className="fm-empty-fields">
                  <FileText size={32} />
                  <p>No fields yet. Add your first field below.</p>
                </div>
              )}
              {fields.map((fld, idx) => (
                <FieldEditor
                  key={fld.id}
                  field={fld}
                  onChange={updated => updateField(idx, updated)}
                  onDelete={() => deleteField(idx)}
                  onMove={dir => moveField(idx, dir)}
                  isFirst={idx === 0}
                  isLast={idx === fields.length - 1}
                />
              ))}

              {/* Add Field Buttons */}
              <div className="fm-add-field-row">
                <span className="fm-add-field-label">Add Field:</span>
                {FIELD_TYPES.slice(0, 6).map(t => (
                  <button key={t.value} type="button" className="fm-add-field-btn" onClick={() => addField(t.value)}>
                    {t.icon} {t.label}
                  </button>
                ))}
                <button type="button" className="fm-add-field-btn" onClick={() => addField('select')}><ChevronDown size={13}/> Dropdown</button>
                <button type="button" className="fm-add-field-btn" onClick={() => addField('radio')}><List size={13}/> Radio</button>
                <button type="button" className="fm-add-field-btn" onClick={() => addField('checkbox')}><CheckCircle2 size={13}/> Checkbox</button>
                <button type="button" className="fm-add-field-btn" onClick={() => addField('date')}><Calendar size={13}/> Date</button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="fm-settings-pane">
              <div className="fm-settings-grid">
                {/* Visibility */}
                <div className="fm-settings-card">
                  <h3>Visibility</h3>
                  <div className="fm-setting-row">
                    <div>
                      <span className="fm-setting-label">Published</span>
                      <span className="fm-setting-desc">Make this form publicly accessible at /forms/[slug]</span>
                    </div>
                    <button type="button" className={`fm-toggle ${isPublished ? 'fm-toggle--on' : ''}`} onClick={() => setIsPublished(v => !v)}>
                      {isPublished ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                  <div className="fm-setting-row">
                    <div>
                      <span className="fm-setting-label">Require Login</span>
                      <span className="fm-setting-desc">Respondents must sign in with KL Microsoft account</span>
                    </div>
                    <button type="button" className={`fm-toggle ${requiresLogin ? 'fm-toggle--on' : ''}`} onClick={() => setRequiresLogin(v => !v)}>
                      {requiresLogin ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                  <div className="fm-setting-row">
                    <div>
                      <span className="fm-setting-label">Allow Multiple Submissions</span>
                      <span className="fm-setting-desc">Same user can submit more than once</span>
                    </div>
                    <button type="button" className={`fm-toggle ${allowMultiple ? 'fm-toggle--on' : ''}`} onClick={() => setAllowMultiple(v => !v)}>
                      {allowMultiple ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                </div>

                {/* Limits */}
                <div className="fm-settings-card">
                  <h3>Limits & Timing</h3>
                  <div className="fm-form-group">
                    <label>Max Responses</label>
                    <input className="fm-input" type="number" min="1" value={maxResponses} onChange={e => setMaxResponses(e.target.value)} placeholder="Unlimited" />
                    <span className="fm-hint">Leave blank for unlimited</span>
                  </div>
                  <div className="fm-form-group">
                    <label>Close At (Auto-close date)</label>
                    <input className="fm-input" type="datetime-local" value={closeAt} onChange={e => setCloseAt(e.target.value)} />
                    <span className="fm-hint">Leave blank to never auto-close</span>
                  </div>
                </div>

                {/* Appearance */}
                <div className="fm-settings-card">
                  <h3>Appearance</h3>
                  <div className="fm-form-group">
                    <label>Cover Image URL</label>
                    <input className="fm-input" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="fm-form-group">
                    <label>Success Message</label>
                    <textarea className="fm-input fm-textarea" rows={3} value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="fm-modal-footer">
          <button type="button" className="admin-dash__cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="admin-dash__save-btn" onClick={handleSave} disabled={saving}>
            <Save size={15}/> {saving ? 'Saving...' : isNew ? 'Create Form' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResponsesModal({ form, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResp, setSelectedResp] = useState(null);

  React.useEffect(() => {
    fetch(`/api/forms/${form._id}/responses`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setResponses(data); })
      .finally(() => setLoading(false));
  }, [form._id]);

  const exportCSV = () => {
    if (!responses.length) return;
    const fieldIds = form.fields.map(f => f.id);
    const fieldLabels = form.fields.map(f => f.label);
    const headers = ['Submitted At', 'Name', 'Email', 'Roll No', ...fieldLabels];
    const rows = responses.map(r => [
      new Date(r.submittedAt).toLocaleString(),
      r.submitterName || '',
      r.submitterEmail || '',
      r.submitterRoll || '',
      ...fieldIds.map(id => {
        const v = r.answers?.[id];
        return Array.isArray(v) ? v.join('; ') : (v ?? '');
      })
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${form.slug}-responses.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-dash__modal-overlay" onClick={onClose}>
      <div className="admin-dash__modal fm-modal" style={{ width: '92vw', maxWidth: 1000, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <div>
            <h2 className="fm-modal-title">Responses — {form.title}</h2>
            <p className="fm-modal-slug">{responses.length} total responses</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="admin-dash__cancel-btn" onClick={exportCSV}><Download size={14}/> Export CSV</button>
            <button className="admin-dash__cancel-btn" onClick={onClose}><X size={14}/> Close</button>
          </div>
        </div>
        <div className="fm-modal-body" style={{ overflow: 'auto' }}>
          {loading ? <div className="fm-empty-fields">Loading responses...</div> : responses.length === 0 ? (
            <div className="fm-empty-fields"><Users size={32}/><p>No responses yet.</p></div>
          ) : (
            <table className="fm-resp-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Name / Email</th>
                  {form.fields.slice(0, 4).map(f => <th key={f.id}>{f.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {responses.map(r => (
                  <tr key={r._id} onClick={() => setSelectedResp(r)} className="fm-resp-row">
                    <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.submitterName || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{r.submitterEmail}</div>
                    </td>
                    {form.fields.slice(0, 4).map(f => (
                      <td key={f.id} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Array.isArray(r.answers?.[f.id]) ? r.answers[f.id].join(', ') : (r.answers?.[f.id] ?? '—')}
                      </td>
                    ))}
                    <td><ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.4)' }}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Single response detail */}
        {selectedResp && (
          <div className="admin-dash__modal-overlay" style={{ zIndex: 110 }} onClick={() => setSelectedResp(null)}>
            <div className="admin-dash__modal" style={{ width: '70vw', maxWidth: 640 }} onClick={e => e.stopPropagation()}>
              <div className="admin-dash__modal-header">
                <h3>Response Detail</h3>
              </div>
              <div className="admin-dash__modal-body">
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
                  Submitted: {new Date(selectedResp.submittedAt).toLocaleString()}
                  {selectedResp.submitterName && ` · ${selectedResp.submitterName}`}
                  {selectedResp.submitterRoll && ` (${selectedResp.submitterRoll})`}
                </p>
                {form.fields.map(f => (
                  <div key={f.id} className="admin-dash__field" style={{ marginBottom: 14 }}>
                    <label style={{ marginBottom: 4 }}>{f.label}</label>
                    <div className="admin-rec-motivation-box" style={{ minHeight: 'auto', padding: '10px 14px' }}>
                      {Array.isArray(selectedResp.answers?.[f.id])
                        ? selectedResp.answers[f.id].join(', ')
                        : (selectedResp.answers?.[f.id] || <em style={{ opacity: 0.4 }}>—</em>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-dash__modal-actions">
                <button className="admin-dash__save-btn" onClick={() => setSelectedResp(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormsSection({ forms: initialForms = [], refreshData }) {
  const [forms, setForms] = useState(initialForms);
  const [loadingForms, setLoadingForms] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [viewingResponses, setViewingResponses] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const res = await fetch('/api/forms');
      if (res.ok) setForms(await res.json());
    } catch {} finally { setLoadingForms(false); }
  }, []);

  React.useEffect(() => { loadForms(); }, [loadForms]);

  const handleSave = (saved) => {
    setForms(prev => {
      const idx = prev.findIndex(f => f._id === saved._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowBuilder(false);
    setEditingForm(null);
  };

  const togglePublish = async (form) => {
    const res = await fetch(`/api/forms/${form._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !form.isPublished }),
    });
    if (res.ok) { const updated = await res.json(); setForms(prev => prev.map(f => f._id === updated._id ? updated : f)); }
  };

  const handleDelete = async (form) => {
    if (!confirm(`Delete form "${form.title}" and all ${form.responseCount} responses? This cannot be undone.`)) return;
    setDeletingId(form._id);
    await fetch(`/api/forms/${form._id}`, { method: 'DELETE' });
    setForms(prev => prev.filter(f => f._id !== form._id));
    setDeletingId(null);
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}`);
  };

  return (
    <div className="admin-main__content">
      {/* Header */}
      <div className="admin-section-header">
        <div>
          <h1 className="admin-section-title">Forms</h1>
          <p className="admin-section-sub">Create and manage custom forms. Share at klforge.in/forms/[slug]</p>
        </div>
        <button
          type="button"
          className="admin-dash__save-btn"
          onClick={() => { setEditingForm(null); setShowBuilder(true); }}
        >
          <Plus size={16}/> New Form
        </button>
      </div>

      {/* Forms Grid */}
      {loadingForms ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', padding: 40, textAlign: 'center' }}>Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="fm-empty-state">
          <FileText size={44} />
          <h3>No Forms Yet</h3>
          <p>Create your first form to collect structured responses from members or the public.</p>
          <button className="admin-dash__save-btn" onClick={() => { setEditingForm(null); setShowBuilder(true); }}>
            <Plus size={15}/> Create First Form
          </button>
        </div>
      ) : (
        <div className="fm-forms-grid">
          {forms.map(form => (
            <div key={form._id} className="fm-form-row">
              <div className="fm-form-row__status">
                <span className={`fm-status-dot ${form.isPublished ? 'fm-status-dot--live' : 'fm-status-dot--draft'}`} />
                <span className="fm-status-label">{form.isPublished ? 'Live' : 'Draft'}</span>
              </div>
              <div className="fm-form-row__info">
                <h3 className="fm-form-row__title">{form.title}</h3>
                <p className="fm-form-row__slug">/forms/{form.slug}</p>
                <div className="fm-form-row__meta">
                  <span><FileText size={12}/> {form.fields?.length || 0} fields</span>
                  <span><Users size={12}/> {form.responseCount || 0} responses</span>
                  {form.maxResponses && <span><Hash size={12}/> Max: {form.maxResponses}</span>}
                  {form.closeAt && <span><Calendar size={12}/> Closes: {new Date(form.closeAt).toLocaleDateString()}</span>}
                  {form.requiresLogin && <span style={{ color: '#71C4FF' }}>🔒 Login required</span>}
                </div>
              </div>
              <div className="fm-form-row__actions">
                <button type="button" className="fm-action-btn" onClick={() => copyLink(form.slug)} title="Copy link"><Copy size={14}/></button>
                {form.isPublished && (
                  <a href={`/forms/${form.slug}`} target="_blank" rel="noreferrer" className="fm-action-btn" title="Open form"><ExternalLink size={14}/></a>
                )}
                <button type="button" className="fm-action-btn" onClick={() => setViewingResponses(form)} title="View responses">
                  <List size={14}/> {form.responseCount > 0 && <span className="fm-resp-count">{form.responseCount}</span>}
                </button>
                <button type="button" className={`fm-action-btn ${form.isPublished ? 'fm-action-btn--yellow' : 'fm-action-btn--green'}`} onClick={() => togglePublish(form)} title={form.isPublished ? 'Unpublish' : 'Publish'}>
                  {form.isPublished ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
                <button type="button" className="fm-action-btn fm-action-btn--blue" onClick={() => { setEditingForm(form); setShowBuilder(true); }} title="Edit">
                  <Edit3 size={14}/>
                </button>
                <button type="button" className="fm-action-btn fm-action-btn--red" onClick={() => handleDelete(form)} disabled={deletingId === form._id} title="Delete">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showBuilder && (
        <FormBuilderModal
          form={editingForm}
          onClose={() => { setShowBuilder(false); setEditingForm(null); }}
          onSave={handleSave}
        />
      )}
      {viewingResponses && (
        <ResponsesModal form={viewingResponses} onClose={() => setViewingResponses(null)} />
      )}
    </div>
  );
}
