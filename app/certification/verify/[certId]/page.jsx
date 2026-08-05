'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, ShieldX, Award, Calendar, User, FileText, Download, CheckCircle2, Copy, Check, Eye, ExternalLink } from 'lucide-react';
import BackButton from '@/src/components/BackButton';
import Footer from '@/src/components/Footer';
import './page.css';

const ROLE_LABELS = {
    winner: 'Winner (1st Place)',
    runner_up: 'Runner-Up (2nd Place)',
    third_place: 'Third Place',
    participant: 'Participant',
};

export default function VerifyCertificatePage() {
    const { certId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/certificates/verify/${certId}`)
            .then((r) => r.json().then((j) => ({ status: r.status, body: j })))
            .then(({ status, body }) => {
                if (cancelled) return;
                if (status === 200 && body.valid) setData({ valid: true, ...body.certificate });
                else setData({ valid: false, ...body });
            })
            .catch((e) => !cancelled && setData({ valid: false, reason: 'error', error: e.message }))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [certId]);

    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadUrl = `/api/certificates/${certId}/download`;

    return (
        <div className="events-page cv-page">
            <div className="events-page__topbar">
                <BackButton to="/events" />
            </div>

            <div className="events-page__header">
                <h1 className="events-page__title">Certificate Verification</h1>
                <p className="events-page__subtitle">Official Digital Record &amp; Authenticity Verification</p>
            </div>

            <main className="cv-main">
                <div className="cv-container">
                    {loading ? (
                        <div className="event-card cv-card cv-card--loading">
                            <div className="cv-spinner" />
                            <p className="cv-loading-text">Verifying certificate authenticity against KLForge database...</p>
                        </div>
                    ) : !data?.valid ? (
                        <div className="event-card cv-card cv-card--invalid">
                            <div className="cv-icon"><ShieldX size={48} /></div>
                            <h2>Invalid Certificate</h2>
                            <p className="cv-sub">
                                {data?.reason === 'not_found' && 'No certificate matches this ID. It may have been entered incorrectly or was never issued.'}
                                {data?.reason === 'revoked' && 'This certificate has been revoked by the issuing organization.'}
                                {data?.reason === 'error' && `Verification failed: ${data?.error}`}
                            </p>
                            <code className="cv-cert-id">{certId}</code>
                        </div>
                    ) : (
                        /* Main Split Layout matching Website Card Styling */
                        <div className="cv-split">
                            {/* Left Column: Live PDF Certificate Viewer */}
                            <div className="event-card cv-preview-card">
                                <div className="cv-preview-header">
                                    <span className="cv-preview-title"><Eye size={14} /> Certificate Document Preview</span>
                                    <a href={downloadUrl} target="_blank" rel="noreferrer" className="cv-btn-ghost">
                                        <ExternalLink size={13} /> Open Full PDF
                                    </a>
                                </div>
                                <div className="cv-pdf-frame-wrap">
                                    <iframe
                                        src={`${downloadUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="cv-pdf-iframe"
                                        title="Certificate PDF Preview"
                                    />
                                </div>
                                <div className="cv-preview-footer">
                                    <span className="cv-security-note">
                                        <CheckCircle2 size={13} color="#00f2ff" /> High-resolution digital PDF generated from official KLForge event template.
                                    </span>
                                </div>
                            </div>

                            {/* Right Column: Authenticity Details & Verification Stamp */}
                            <div className="event-card cv-details-card">
                                <div className="cv-card-top">
                                    <div className="cv-shield-icon"><ShieldCheck size={44} /></div>
                                    <div className="cv-badge-valid">AUTHENTIC &amp; VERIFIED</div>
                                    <h2>Certificate of {ROLE_LABELS[data.eventRole] || data.eventRole}</h2>
                                    <p className="cv-sub">Officially issued by <strong>KLForge</strong> for verified event achievement.</p>
                                </div>

                                <div className="cv-grid">
                                    <div className="cv-field">
                                        <User size={16} className="cv-field-icon" />
                                        <div className="cv-field-content">
                                            <span className="cv-label">Holder Name</span>
                                            <span className="cv-value">{data.name}</span>
                                            {data.memberRoll && <span className="cv-subvalue">Roll Number: {data.memberRoll}</span>}
                                        </div>
                                    </div>

                                    <div className="cv-field">
                                        <FileText size={16} className="cv-field-icon" />
                                        <div className="cv-field-content">
                                            <span className="cv-label">Event Name</span>
                                            <span className="cv-value">{data.eventTitle}</span>
                                        </div>
                                    </div>

                                    <div className="cv-field">
                                        <Award size={16} className="cv-field-icon" />
                                        <div className="cv-field-content">
                                            <span className="cv-label">Award / Position</span>
                                            <span className="cv-value cv-value--highlight">{ROLE_LABELS[data.eventRole] || data.eventRole}</span>
                                        </div>
                                    </div>

                                    <div className="cv-field">
                                        <Calendar size={16} className="cv-field-icon" />
                                        <div className="cv-field-content">
                                            <span className="cv-label">Date Issued</span>
                                            <span className="cv-value">
                                                {new Date(data.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="cv-cert-id-block">
                                    <span className="cv-label">Unique Verification ID</span>
                                    <code className="cv-cert-id">{data.certificateId}</code>
                                </div>

                                <div className="cv-actions">
                                    <a href={downloadUrl} target="_blank" rel="noreferrer" className="cv-btn cv-btn--primary">
                                        <Download size={16} /> Download Certificate PDF
                                    </a>
                                    <button type="button" className="cv-btn cv-btn--secondary" onClick={handleCopyLink}>
                                        {copied ? <Check size={16} color="#00f2ff" /> : <Copy size={16} />}
                                        {copied ? 'Verification Link Copied!' : 'Copy Verification Link'}
                                    </button>
                                </div>

                                <footer className="cv-card-footer">
                                    <p>Ledger Hash: <code>{data.certificateId}</code></p>
                                    <p className="cv-legal">Recorded permanently in the KLForge Digital Credential Registry.</p>
                                </footer>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <div className="footer-separator" />
            <Footer />
        </div>
    );
}
