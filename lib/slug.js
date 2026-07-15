/**
 * slug.js — Canonical URL slug for a Member.
 *
 * Rule: a member's slug is the local-part of their KL University email.
 *   - praveen.kanaparthy@kluniversity.in → /praveen.kanaparthy
 *   - 2400080202@kluniversity.in        → /2400080202
 *   - (no email yet, has roll number)    → /<rollNumber>
 *
 * The same function is used by:
 *   • /api/auth/[...nextauth] (lib/auth.js) when auto-provisioning rows
 *   • The admin member form, when patching `id`
 *   • The /[memberId] page when resolving a slug → row
 *   • Anywhere we generate a profile link
 *
 * Result is *always* URL-safe. Falls back to the roll number if email is missing.
 */

export function emailLocalPart(email) {
    if (!email || typeof email !== 'string') return '';
    const at = email.indexOf('@');
    return at === -1 ? email.trim() : email.slice(0, at).trim();
}

/**
 * Derive the canonical slug from any combination of (email, rollNumber).
 * Prefers email local-part; falls back to rollNumber.
 */
export function memberSlug({ email, rollNumber }) {
    const fromEmail = emailLocalPart(email);
    if (fromEmail) return fromEmail;
    if (rollNumber) return String(rollNumber).trim();
    return '';
}

/**
 * Whether a string is a valid member slug (URL-safe, non-empty).
 */
export function isValidSlug(s) {
    return typeof s === 'string' && s.length > 0 && s.length <= 100;
}
