#!/usr/bin/env node
/**
 * Backfill Media.title from s3Key for any doc whose title is empty.
 * Run from project root: node scripts/backfill-media-titles.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URI = process.env.MONGO_URI;
if (!URI) {
    console.error('MONGO_URI not set. Aborting.');
    process.exit(1);
}

await mongoose.connect(URI, { dbName: 'klforge' });
const db = mongoose.connection.db;
const col = db.collection('media');

const cursor = col.find({
    $or: [
        { title: { $exists: false } },
        { title: '' },
        { title: null },
    ],
});

let updated = 0;
let skipped = 0;
for await (const doc of cursor) {
    const key = doc.s3Key || '';
    // key looks like:  media/General/1784142332206_screenshot_2026_06_14_at_10.55.36_pm.png
    const fileName = key.split('/').pop() || '';
    const stem = fileName.replace(/\.[^.]+$/, '');                 // strip ext
    const stripped = stem.replace(/^\d+_/, '');                     // strip leading timestamp_
    const title = stripped.replace(/[_-]+/g, ' ').trim() || fileName;
    if (!title) { skipped++; continue; }
    await col.updateOne({ _id: doc._id }, { $set: { title } });
    updated++;
}
console.log(`Updated ${updated} media items, skipped ${skipped}.`);
await mongoose.disconnect();
