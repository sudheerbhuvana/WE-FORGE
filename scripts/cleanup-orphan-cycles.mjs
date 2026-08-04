import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI, { dbName: 'klforge' });
const db = mongoose.connection.db;
const tplId = new mongoose.Types.ObjectId('6a726c1e780ae942a8d7cbdf');

// 1) Delete orphan cycles 16 & 17 (not part of original 15-cycle seed)
const r1 = await db.collection('contestcycles').deleteMany({
  templateId: tplId,
  cycleNumber: { $in: [16, 17, 33] },
});
console.log('deleted orphan cycles:', r1.deletedCount);

// 2) Delete any orphan submissions tied to cycles that don't belong
const cycles = await db.collection('contestcycles')
  .find({ templateId: tplId }, { projection: { _id: 1, cycleNumber: 1 } })
  .sort({ cycleNumber: 1 })
  .toArray();
console.log('remaining cycles:', cycles.map(c => c.cycleNumber));
const validCycleIds = cycles.map(c => c._id);
const r2 = await db.collection('contestsubmissions').deleteMany({
  cycleId: { $nin: validCycleIds },
  templateId: tplId,
});
console.log('deleted orphan submissions:', r2.deletedCount);

// 3) Reset activeCycleId to latest (cycle #15)
const latest = cycles[cycles.length - 1];
if (latest) {
  await db.collection('contesttemplates').updateOne(
    { _id: tplId },
    { $set: { activeCycleId: latest._id } }
  );
  console.log('reset activeCycleId to cycle #' + latest.cycleNumber);
}

const total = await db.collection('contestcycles').countDocuments({ templateId: tplId });
const subs = await db.collection('contestsubmissions').countDocuments({ templateId: tplId });
console.log(`final: ${total} cycles, ${subs} submissions for weekly-showcase`);

await mongoose.disconnect();
