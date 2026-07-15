/**
 * backfill-slugs.mjs — Make every existing Member's slug (=id, =rollNumber)
 * match the canonical rule: local-part of the @kluniversity.in email.
 *
 * Run:  node scripts/backfill-slugs.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Member from '../lib/models/Member.js';

function emailLocalPart(email) {
    if (!email) return '';
    const at = email.indexOf('@');
    return at === -1 ? email.trim() : email.slice(0, at).trim();
}

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('No Mongo URI');

    await mongoose.connect(uri, { dbName: 'klforge', serverSelectionTimeoutMS: 5000 });

    const cursor = Member.find({}).cursor();
    let updated = 0;
    const collisions = [];

    for await (const m of cursor) {
        const fromEmail = emailLocalPart(m.email);
        if (!fromEmail) continue;                       // no email → leave as-is
        if (m.id === fromEmail && m.rollNumber === fromEmail) continue;

        // If another doc already owns this slug, skip with a warning
        const existing = await Member.findOne({
            $or: [{ id: fromEmail }, { rollNumber: fromEmail }],
            _id: { $ne: m._id },
        });
        if (existing) {
            collisions.push({ name: m.name, wouldBecome: fromEmail, takenBy: existing.name });
            continue;
        }

        m.id = fromEmail;
        if (!m.rollNumber) m.rollNumber = fromEmail;
        await m.save();
        updated++;
    }

    console.log(`✓ Updated ${updated} members`);
    if (collisions.length) {
        console.warn('Skipped (slug conflict):', collisions);
    }
    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
