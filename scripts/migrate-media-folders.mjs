#!/usr/bin/env node
// One-shot migration: ensure every Media doc has folder/favorite populated.
// Run with: node scripts/migrate-media-folders.mjs
import connectDB from '../lib/db.js';
import Media from '../lib/models/Media.js';

(async () => {
    await connectDB();
    const docs = await Media.find({});
    let updated = 0;
    for (const d of docs) {
        const patch = {};
        if (!d.folder) patch.folder = d.eventName || 'General';
        if (d.favorite === undefined || d.favorite === null) patch.favorite = false;
        if (!d.title) patch.title = '';
        if (!d.description) patch.description = '';
        if (Object.keys(patch).length) {
            await Media.updateOne({ _id: d._id }, { $set: patch });
            updated++;
        }
    }
    console.log(`migrated ${updated} of ${docs.length} media docs`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });