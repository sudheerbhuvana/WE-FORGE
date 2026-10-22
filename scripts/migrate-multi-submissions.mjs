/**
 * migrate-multi-submissions.mjs
 * ──────────────────────────────────────────────────────────────
 * Prepares the database for multiple contest entries per member.
 *
 * WHY THIS IS NEEDED
 *   The old schema carried a UNIQUE compound index on
 *   { cycleId, memberId }, which made a second entry from the same
 *   person impossible — Mongo rejected the write. The schema file now
 *   declares a plain (non-unique) index instead, but Mongoose will
 *   NOT drop an already-created unique index just because the code
 *   changed. Until it is dropped in the live database, members are
 *   still capped at one entry per cycle.
 *
 *   The unique index also exists under an auto-generated name
 *   (cycleId_1_memberId_1), not the name given in schema options,
 *   so this script looks it up by key rather than by name.
 *
 * WHAT IT DOES (idempotent — safe to run more than once)
 *   1. Drops the unique { cycleId, memberId } index if present.
 *   2. Backfills entryNumber = 1 on documents that predate the field.
 *   3. Reports the resulting indexes so you can confirm the result.
 *
 * Run:  node scripts/migrate-multi-submissions.mjs
 *
 * NOTE: this touches the live database. Take a backup first.
 * ──────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../lib/db.js';
import ContestSubmission from '../lib/models/ContestSubmission.js';

const COLLECTION = 'contestsubmissions';
const LEGACY_KEYS = { cycleId: 1, memberId: 1 };

async function main() {
  await connectDB();
  console.log('✓ Connected to DB');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No active database connection');

  const exists = await db.listCollections({ name: COLLECTION }).hasNext();
  if (!exists) {
    console.log(`⚠ Collection "${COLLECTION}" does not exist yet — nothing to migrate.`);
    await mongoose.disconnect();
    return;
  }

  // ── 1. Drop the legacy unique index ────────────────────────────────────
  let indexes;
  try {
    indexes = await db.collection(COLLECTION).indexes();
  } catch (err) {
    console.error('✗ Could not read indexes:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  const legacy = indexes.find(
    (ix) => ix.unique === true && sameKeys(ix.key, LEGACY_KEYS)
  );

  if (!legacy) {
    console.log('• No unique { cycleId, memberId } index found — already migrated (or never present).');
  } else {
    console.log(`→ Dropping legacy unique index "${legacy.name}"…`);
    try {
      await db.collection(COLLECTION).dropIndex(legacy.name);
      console.log('✓ Dropped unique index.');
    } catch (err) {
      console.error('✗ Failed to drop index:', err.message);
      console.error('  Members will remain limited to one entry per cycle until this succeeds.');
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  // ── 2. Ensure the replacement indexes exist ────────────────────────────
  try {
    await ContestSubmission.createIndexes();
    console.log('✓ Ensured non-unique { cycleId, memberId } index exists.');
  } catch (err) {
    console.error('⚠ Could not create replacement index:', err.message);
  }

  // ── 3. Backfill entryNumber for pre-existing documents ─────────────────
  const total = await ContestSubmission.countDocuments({});
  const missing = await ContestSubmission.countDocuments({
    $or: [{ entryNumber: { $exists: false } }, { entryNumber: null }],
  });

  if (missing > 0) {
    const res = await ContestSubmission.updateMany(
      { $or: [{ entryNumber: { $exists: false } }, { entryNumber: null }] },
      { $set: { entryNumber: 1 } }
    );
    console.log(`✓ Backfilled entryNumber=1 on ${res.modifiedCount} document(s).`);
  } else {
    console.log('• All documents already have entryNumber.');
  }

  // ── 4. Report final state ──────────────────────────────────────────────
  const finalIndexes = await db.collection(COLLECTION).indexes();
  console.log('\nIndexes on ' + COLLECTION + ':');
  for (const ix of finalIndexes) {
    console.log(`  - ${ix.name}  unique=${!!ix.unique}  ${JSON.stringify(ix.key)}`);
  }

  console.log(`\nSubmissions total: ${total}`);
  console.log(`Cycle/member pairs with >1 entry: ${await countMultiEntryPairs()}`);

  await mongoose.disconnect();
  console.log('\n✅ Migration complete.');
}

function sameKeys(a = {}, b = {}) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  return ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

async function countMultiEntryPairs() {
  const rows = await ContestSubmission.aggregate([
    { $group: { _id: { cycleId: '$cycleId', memberId: '$memberId' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'pairs' },
  ]);
  return rows[0]?.pairs || 0;
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});