/**
 * migrate-roles.mjs — one-shot backfill for the new Member.roles array.
 *
 * For every Member that doesn't yet have a `roles` array, populate it from
 * the existing top-level `domain` + `role` fields. Also seeds default
 * Domain rows if the `domains` collection is empty.
 *
 * Run: node scripts/migrate-roles.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Member from '../lib/models/Member.js';
import Domain from '../lib/models/Domain.js';

const ADMIN_ROLE_TITLES = ['Chief', 'Lead', 'Co-Lead', 'Head'];

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI / MONGO_URI not set');

    await mongoose.connect(uri, {
        dbName: 'klforge',
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });

    // ── Seed default domains if none exist ────────────────────────────
    const existingDomainCount = await Domain.countDocuments();
    if (existingDomainCount === 0) {
        const defaults = [
            { name: 'Tech & Innovation', slug: 'tech-innovation', icon: 'Cpu',          color: '#71C4FF' },
            { name: 'AI / ML',           slug: 'ai-ml',           icon: 'Brain',        color: '#a855f7' },
            { name: 'Media',             slug: 'media',           icon: 'Camera',       color: '#f43f5e' },
            { name: 'Design',            slug: 'design',          icon: 'Palette',      color: '#f59e0b' },
            { name: 'Events',            slug: 'events',          icon: 'Calendar',     color: '#10b981' },
            { name: 'Zero Order',        slug: 'zero-order',      icon: 'Crown',        color: '#ffffff' },
            { name: 'Advisor',           slug: 'advisor',         icon: 'GraduationCap', color: '#94a3b8' },
            { name: 'General',           slug: 'general',         icon: 'Users',        color: '#94a3b8' },
        ];
        await Domain.insertMany(defaults.map(d => ({
            ...d,
            adminRoles: ADMIN_ROLE_TITLES,
            orderIndex: 0,
            isActive: true,
        })));
        console.log(`✓ Seeded ${defaults.length} default domains`);
    } else {
        console.log(`✓ ${existingDomainCount} domains already exist`);
    }

    // ── Backfill Member.roles ─────────────────────────────────────────
    const members = await Member.find({ $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }] });
    console.log(`→ Found ${members.length} members needing roles backfill`);

    let updated = 0;
    for (const m of members) {
        const roles = [];
        if (m.domain && m.role) {
            roles.push({ domain: m.domain, role: m.role });
        }
        // Chief of a domain gets a second implicit role if they appear under a different display name.
        if (m.role === 'Chief' && m.domain && !roles.some(r => r.role === 'Chief')) {
            roles.push({ domain: m.domain, role: 'Chief' });
        }
        m.roles = roles;
        await m.save();
        updated++;
    }

    console.log(`✓ Updated ${updated} members.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});