'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Check, RefreshCw, Activity, Lock, Key, Terminal, Save, AlertCircle
} from 'lucide-react';
import '../../../app/admin/dashboard/AdminDashboard.css';

export default function SystemSettingsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/system/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error || 'Failed to load system configuration');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error to configuration service');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleRateLimitChange = (actionType, field, value) => {
    const num = Math.max(1, parseInt(value) || 1);
    setSettings(prev => ({
      ...prev,
      rateLimits: {
        ...prev.rateLimits,
        [actionType]: {
          ...prev.rateLimits?.[actionType],
          [field]: num,
        }
      }
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showToast('System policy updated');
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError(err.message || 'Save error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
        LOADING SYSTEM CONFIGURATION...
      </div>
    );
  }

  return (
    <div style={{ color: '#fff', maxWidth: 1100 }}>
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#10b981', color: '#000', fontWeight: 700,
          padding: '10px 20px', borderRadius: 8, fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace'
        }}>
          <Check size={16} /> {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              System & Security Policy
            </h2>
            <span style={{
              fontSize: '0.68rem', fontFamily: 'monospace', padding: '3px 8px', borderRadius: 4,
              background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              v2.4 SEC ENGINE
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            Manage core operational flags, registration gates, and traffic limit policies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchSettings}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
              color: '#000', fontWeight: 700, border: 'none', padding: '8px 18px',
              borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* SYSTEM TOGGLES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
        
        {/* Rate Limiting Toggle */}
        <div style={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TRAFFIC PROTECTION
            </span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: settings?.rateLimitingEnabled ? '#10b981' : '#ef4444',
              boxShadow: settings?.rateLimitingEnabled ? '0 0 8px #10b981' : 'none'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>Rate Limiting Engine</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {settings?.rateLimitingEnabled ? 'Active (Sliding Window)' : 'Disabled (Bypass All)'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('rateLimitingEnabled')}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: settings?.rateLimitingEnabled ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'all 0.15s ease', padding: 2
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#000',
                transform: settings?.rateLimitingEnabled ? 'translateX(20px)' : 'translateX(0px)',
                transition: 'all 0.15s ease'
              }} />
            </button>
          </div>
        </div>

        {/* User Signups Toggle */}
        <div style={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ACCESS GATEWAY
            </span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: settings?.signupsEnabled ? '#10b981' : '#ef4444',
              boxShadow: settings?.signupsEnabled ? '0 0 8px #10b981' : 'none'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>User Registration</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {settings?.signupsEnabled ? 'Open for new SSO accounts' : 'Closed for new registrations'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('signupsEnabled')}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: settings?.signupsEnabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'all 0.15s ease', padding: 2
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#000',
                transform: settings?.signupsEnabled ? 'translateX(20px)' : 'translateX(0px)',
                transition: 'all 0.15s ease'
              }} />
            </button>
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div style={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PLATFORM STATE
            </span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: settings?.maintenanceMode ? '#f59e0b' : '#38bdf8'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>Maintenance Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {settings?.maintenanceMode ? 'Active Maintenance Banner' : 'Normal Production Mode'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('maintenanceMode')}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: settings?.maintenanceMode ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'all 0.15s ease', padding: 2
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#000',
                transform: settings?.maintenanceMode ? 'translateX(20px)' : 'translateX(0px)',
                transition: 'all 0.15s ease'
              }} />
            </button>
          </div>
        </div>

      </div>

      {/* RATE LIMIT THRESHOLDS TABLE */}
      <div style={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Rate Limit Parameters</h3>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Max request thresholds enforced per 60-second sliding window</span>
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>WINDOW: 60s</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          
          {/* Auth Limit */}
          <div style={{ background: '#0b0c10', padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              AUTH & SIGNIN
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
              Authentication Requests
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="500"
                value={settings?.rateLimits?.auth?.max || 10}
                onChange={(e) => handleRateLimitChange('auth', 'max', e.target.value)}
                style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>req / min</span>
            </div>
          </div>

          {/* API Limit */}
          <div style={{ background: '#0b0c10', padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              GENERAL API
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
              Standard API Data Calls
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="2000"
                value={settings?.rateLimits?.api?.max || 100}
                onChange={(e) => handleRateLimitChange('api', 'max', e.target.value)}
                style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>req / min</span>
            </div>
          </div>

          {/* Upload Limit */}
          <div style={{ background: '#0b0c10', padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              MEDIA UPLOADS
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
              File Upload Operations
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="200"
                value={settings?.rateLimits?.upload?.max || 15}
                onChange={(e) => handleRateLimitChange('upload', 'max', e.target.value)}
                style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>req / min</span>
            </div>
          </div>

          {/* Certificate Limit */}
          <div style={{ background: '#0b0c10', padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              CERTIFICATES
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
              PDF Generation & Downloads
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="500"
                value={settings?.rateLimits?.certificates?.max || 30}
                onChange={(e) => handleRateLimitChange('certificates', 'max', e.target.value)}
                style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>req / min</span>
            </div>
          </div>

        </div>
      </div>

      {/* MAINTENANCE ANNOUNCEMENT CONSOLE */}
      <div style={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            MAINTENANCE ANNOUNCEMENT BANNER
          </span>
        </div>
        <textarea
          rows={2}
          value={settings?.maintenanceMessage || ''}
          onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
          placeholder="System notice displayed during maintenance mode..."
          style={{
            width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff',
            fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'sans-serif'
          }}
        />
      </div>

    </div>
  );
}
