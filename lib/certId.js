import crypto from 'crypto';

/**
 * Generate a KLFORGE-EVT-XXXXXX style certificate ID.
 * Uses crypto.randomBytes for unpredictable, collision-resistant IDs.
 */
export function generateCertificateId() {
    // 5 bytes → 10 hex chars → strip ambiguity-prone chars, uppercase
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `KLFORGE-EVT-${raw}`;
}

/**
 * Validate a certificate ID format (used by verify endpoint).
 */
export function isValidCertificateId(id) {
    return typeof id === 'string' && /^KLFORGE-EVT-[A-Z0-9]{10}$/.test(id);
}

/**
 * Generate a token for public certificate download.
 * Token = SHA256(registrationId + email + certId) — emailed/printed to holder.
 * Holder passes ?token=... to prove they're the right person without login.
 */
export function generateDownloadToken(registrationId, email, certId) {
    return crypto
        .createHash('sha256')
        .update(`${registrationId}|${email.toLowerCase()}|${certId}`)
        .digest('hex');
}

export function verifyDownloadToken(token, registrationId, email, certId) {
    return token === generateDownloadToken(registrationId, email, certId);
}
