'use client';

import React, { useState, useEffect, use } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  ArrowRight, Lock, Send, CheckCircle2, AlertCircle, FileText, Calendar,
  Image as ImageIcon, FileIcon, X, Upload, ShieldCheck,
} from 'lucide-react';
import BackButton from '@/src/components/BackButton';
import Footer from '@/src/components/Footer';
import './page.css';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export default function PublicFormPage({ params }) {
  const { slug } = use(params);
  const { data: session, status: authStatus } = useSession();

  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Field values: { fieldId: value }
  // File fields hold { file: File, name } instead of a primitive value.
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ---- Load the form ----
  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/forms/${slug}`);
        if (cancelled) return;
        if (res.status === 404) {
          setLoadError('not_found');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setLoadError(body.error || `Request failed (${res.status})`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!data.isPublished) {
          setLoadError('unpublished');
          return;
        }
        if (data.closeAt && new Date() > new Date(data.closeAt)) {
          setLoadError('closed');
          return;
        }
        if (data.maxResponses && data.responseCount >= data.maxResponses) {
          setLoadError('limit_reached');
          return;
        }
        setForm(data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ---- Derived state ----
  const isClosed = form?.closeAt && new Date() > new Date(form.closeAt);
  const isFull = form?.maxResponses && form.responseCount >= form.maxResponses;
  const needsLogin = !!form?.requiresLogin && authStatus !== 'authenticated';
  const canRenderForm = form && !isClosed && !isFull && !needsLogin;

  // ---- Submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form || submitting) return;

    // Build answers payload (omit empty file slots)
    const answers = {};
    const files = [];
    const fileFieldIds = [];

    for (const field of form.fields) {
      const v = values[field.id];
      if (field.type === 'file') {
        if (v && v.file) {
          files.push(v.file);
          fileFieldIds.push(field.id);
        }
        // Don't push a value for the file field — server will attach the upload
      } else if (field.type === 'checkbox') {
        answers[field.id] = Array.isArray(v) ? v : [];
      } else {
        answers[field.id] = v !== undefined ? v : '';
      }
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      let res;
      if (files.length > 0) {
        const fd = new FormData();
        fd.append('answers', JSON.stringify(answers));
        if (session?.user?.name) fd.append('submitterName', session.user.name);
        if (session?.user?.email) fd.append('submitterEmail', session.user.email);
        for (let i = 0; i < files.length; i++) {
          fd.append('files', files[i]);
          fd.append('fileFieldIds', fileFieldIds[i]);
        }
        res = await fetch(`/api/forms/${form._id || form.slug}/responses`, {
          method: 'POST',
          body: fd,
        });
      } else {
        res = await fetch(`/api/forms/${form._id || form.slug}/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            submitterName: session?.user?.name || '',
            submitterEmail: session?.user?.email || '',
          }),
        });
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(body.error || `Submission failed (${res.status})`);
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state">
          <div className="pf-spinner" />
          <p>Loading form…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (loadError === 'not_found') {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state pf-state--error">
          <AlertCircle size={48} />
          <h2>Form not found</h2>
          <p>The link you followed may be broken, or this form may have been deleted.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (loadError === 'unpublished') {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state pf-state--error">
          <Lock size={48} />
          <h2>This form isn’t open right now</h2>
          <p>The form owner hasn’t published this form yet. Please check back later.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (loadError === 'closed' || isClosed) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state pf-state--error">
          <Calendar size={48} />
          <h2>This form has closed</h2>
          {form?.closeAt && (
            <p>Submissions closed on {new Date(form.closeAt).toLocaleString()}.</p>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  if (loadError === 'limit_reached' || isFull) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state pf-state--error">
          <ShieldCheck size={48} />
          <h2>All responses received</h2>
          <p>This form has reached its maximum number of submissions.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (form && needsLogin) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state">
          <Lock size={48} />
          <h2>Login required</h2>
          <p>You need to be signed in to fill out this form.</p>
          <button
            className="pf-btn pf-btn--primary"
            onClick={() => signIn('azure-ad', { callbackUrl: `/forms/${slug}` })}
          >
            Sign in to continue <ArrowRight size={16} />
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-state pf-state--error">
          <AlertCircle size={48} />
          <h2>Unable to load form</h2>
          <p>{loadError || 'Please try again.'}</p>
        </div>
        <Footer />
      </div>
    );
  }

  // ---- Success view ----
  if (submitted) {
    return (
      <div className="pf-page">
        <div className="pf-topbar"><BackButton to="/" /></div>
        <div className="pf-card pf-card--success">
          <CheckCircle2 size={56} className="pf-success-icon" />
          <h2 className="pf-success-title">Response submitted</h2>
          <p className="pf-success-message">{form.successMessage}</p>
          <button className="pf-btn pf-btn--ghost" onClick={() => {
            setSubmitted(false);
            setValues({});
          }}>
            Submit another response
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ---- Main form ----
  return (
    <div className="pf-page">
      <div className="pf-topbar"><BackButton to="/" /></div>

      <div className="pf-card">
        {form.coverImageUrl && (
          <div
            className="pf-cover"
            style={{ backgroundImage: `url(${form.coverImageUrl})` }}
          />
        )}

        <header className="pf-header">
          <div className="pf-header-eyebrow">
            <FileText size={14} /> FORGE Form
          </div>
          <h1 className="pf-title">{form.title}</h1>
          {form.description && (
            <p className="pf-description">{form.description}</p>
          )}
        </header>

        <form className="pf-form" onSubmit={handleSubmit} noValidate>
          {form.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}

          {submitError && (
            <div className="pf-error">
              <AlertCircle size={16} /> {submitError}
            </div>
          )}

          <button
            type="submit"
            className="pf-btn pf-btn--primary pf-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="pf-spinner pf-spinner--sm" /> Submitting…
              </>
            ) : (
              <>
                <Send size={16} /> Submit response
              </>
            )}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  );
}

// ============================================================
// Field renderer
// ============================================================
function FieldRow({ field, value, onChange }) {
  const inputId = `pf-field-${field.id}`;

  return (
    <div className="pf-field">
      <label htmlFor={inputId} className="pf-label">
        {field.label}
        {field.required && <span className="pf-required"> *</span>}
      </label>

      {field.helpText && (
        <p className="pf-help">{field.helpText}</p>
      )}

      {renderInput(field, value, onChange, inputId)}
    </div>
  );
}

function renderInput(field, value, onChange, inputId) {
  const common = {
    id: inputId,
    name: field.id,
    required: !!field.required,
    placeholder: field.placeholder || '',
  };

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...common}
          className="pf-input pf-textarea"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          minLength={field.minLength ?? undefined}
          maxLength={field.maxLength ?? undefined}
          rows={5}
        />
      );

    case 'select':
      return (
        <select
          {...common}
          className="pf-input pf-select"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="pf-options pf-options--stack">
          {(field.options || []).map((opt) => (
            <label key={opt} className="pf-option">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div className="pf-options pf-options--stack">
          {(field.options || []).map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(opt);
            return (
              <label key={opt} className="pf-option">
                <input
                  type="checkbox"
                  name={field.id}
                  value={opt}
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...arr, opt]);
                    else onChange(arr.filter((x) => x !== opt));
                  }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );

    case 'file':
      return <FileInput field={field} value={value} onChange={onChange} inputId={inputId} />;

    case 'number':
      return (
        <input
          {...common}
          type="number"
          className="pf-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <input
          {...common}
          type="date"
          className="pf-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'email':
    case 'url':
    case 'phone':
    case 'text':
    default:
      return (
        <input
          {...common}
          type={
            field.type === 'email' ? 'email'
            : field.type === 'url' ? 'url'
            : field.type === 'phone' ? 'tel'
            : 'text'
          }
          className="pf-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          minLength={field.minLength ?? undefined}
          maxLength={field.maxLength ?? undefined}
        />
      );
  }
}

// ============================================================
// File input
// ============================================================
function FileInput({ field, value, onChange, inputId }) {
  const [error, setError] = useState('');
  const file = value?.file;

  const handleSelect = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setError(`"${selected.name}" exceeds the 25 MB file size limit.`);
      return;
    }
    setError('');
    onChange({ file: selected, name: selected.name });
  };

  const handleClear = () => {
    setError('');
    onChange(undefined);
  };

  const isImage = file?.type?.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileIcon;

  return (
    <div className="pf-file">
      {!file ? (
        <label className="pf-file-drop" htmlFor={inputId}>
          <input
            id={inputId}
            type="file"
            style={{ display: 'none' }}
            onChange={handleSelect}
          />
          <Upload size={20} />
          <span>
            {field.placeholder || 'Click to upload a file'}
            <small> · ≤ 25 MB</small>
          </span>
        </label>
      ) : (
        <div className="pf-file-chosen">
          <Icon size={18} />
          <span className="pf-file-name">{file.name}</span>
          <span className="pf-file-size">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </span>
          <button
            type="button"
            className="pf-file-remove"
            onClick={handleClear}
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && <p className="pf-file-error">{error}</p>}
    </div>
  );
}
