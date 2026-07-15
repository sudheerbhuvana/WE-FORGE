import mongoose from 'mongoose';

/**
 * A club domain (Tech & Innovation, Media, Design, AI/ML, ...).
 * Drives navigation, hero bento, and RBAC scoping.
 */
const domainSchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true },
    slug:        { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'Layers' },   // lucide icon name
    color:       { type: String, default: '#71C4FF' },
    orderIndex:  { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
    // Which role titles are considered "admin-tier" inside this domain.
    // Defaults are populated on first boot if missing.
    adminRoles:  { type: [String], default: ['Chief', 'Lead', 'Co-Lead'] },
    // Org-wide tiers (Zero Order / Advisor / HoD / President / etc.) bypass
    // domain scoping and can manage anything.
    createdAt:   { type: Date, default: Date.now },
});

export default mongoose.models.Domain || mongoose.model('Domain', domainSchema);