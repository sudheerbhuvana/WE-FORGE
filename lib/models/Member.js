import mongoose from 'mongoose';

/**
 * A member's permission inside the club is a list of (domain, role) pairs,
 * e.g.
 *   roles: [
 *     { domain: 'Media',          role: 'Chief' },
 *     { domain: 'Tech & Innovation', role: 'Lead' }
 *   ]
 *
 * A member with NO entries in `roles` is a regular Student / volunteer and
 * can only edit their own profile.
 *
 * `domain` and `role` (singular, top-level) are kept for backwards-compatible
 * display + legacy CSV imports, but the source of truth for permissions is
 * the `roles` array.
 */
const memberRoleSchema = new mongoose.Schema(
    {
        domain: { type: String, required: true },
        role:   { type: String, required: true },
    },
    { _id: false }
);

// Member-curated side projects. Independent of the club-wide /api/projects feed,
// so each member can showcase their own work directly on their profile.
const memberProjectSchema = new mongoose.Schema(
    {
        // Client-supplied stable id (e.g. "<timestamp>-<rand>") so we can target
        // a single entry for removal without depending on Mongoose's ObjectId.
        _id:        { type: String, required: true },
        title:      { type: String, required: true },
        description:{ type: String, default: '' },
        link:       { type: String, default: '' },
        imageUrl:   { type: String, default: '' },
        createdAt:  { type: Date, default: Date.now },
    },
    { _id: false }
);

// Achievements — awards, hackathons, papers, recognitions.
const memberAchievementSchema = new mongoose.Schema(
    {
        _id:    { type: String, required: true },
        title:  { type: String, required: true },
        issuer: { type: String, default: '' },
        date:   { type: String, default: '' }, // free-form: "Mar 2026", "2025", etc.
        link:   { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

// Academic entries — repeatable. The label is free-form ("Sem 4", "Class XII",
// "B.Tech CSE", etc.) so a member can log multiple CGPAs across semesters
// and prior institutions (Class XII + Diploma + UG, etc.).
const memberCgpaSchema = new mongoose.Schema(
    {
        _id:    { type: String, required: true },
        label:  { type: String, default: '' }, // e.g. "Sem 4", "Overall", "Class XII"
        value:  { type: Number, required: true }, // 0–10
        scale:  { type: Number, default: 10 },     // 10 by default
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const memberSchoolSchema = new mongoose.Schema(
    {
        _id:        { type: String, required: true },
        level:      { type: String, default: '' },   // "Class XII", "Diploma", "B.Tech"
        name:       { type: String, required: true },
        boardOrUni: { type: String, default: '' },   // e.g. "BIEAP", "JNTUH"
        year:       { type: String, default: '' },   // "2022–2026"
        createdAt:  { type: Date, default: Date.now },
    },
    { _id: false }
);

// Certifications — courses, exams, professional certs.
const memberCertificationSchema = new mongoose.Schema(
    {
        _id:    { type: String, required: true },
        name:   { type: String, required: true },
        issuer: { type: String, default: '' },
        issued: { type: String, default: '' }, // free-form date
        credentialUrl: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const memberSchema = new mongoose.Schema({
    id:          { type: String, required: true, unique: true },
    name:        { type: String, required: true },
    role:        { type: String, required: true },
    domain:      { type: String, default: '' },
    roles:       { type: [memberRoleSchema], default: [] },

    rollNumber:  { type: String, required: true },
    department:  { type: String, default: '' },
    email:       { type: String, default: '' },
    description: { type: String, default: '' },
    bio:         { type: String, default: '' },
    skills:      { type: [String], default: [] },
    telegram:    { type: String, default: '' },
    github:      { type: String, default: '' },
    linkedin:    { type: String, default: '' },
    status:      { type: String, default: 'Online' },
    photoUrl:    { type: String, default: '' },
    isSuspended: { type: Boolean, default: false },
    orderIndex:  { type: Number, default: 0 },

    // Academic identity (repeatable)
    cgpas:      { type: [memberCgpaSchema],    default: [] },
    schools:    { type: [memberSchoolSchema],  default: [] },

    // Member-curated résumé fields
    projects:       { type: [memberProjectSchema],        default: [] },
    achievements:   { type: [memberAchievementSchema],    default: [] },
    certifications: { type: [memberCertificationSchema],  default: [] },

    createdAt:   { type: Date, default: Date.now },
});

const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);
export default Member;
