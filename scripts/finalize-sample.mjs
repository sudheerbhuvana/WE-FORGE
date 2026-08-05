import 'dotenv/config';
import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGO_URI, { dbName: 'klforge' });
const db = mongoose.connection.db;
const tplId = new mongoose.Types.ObjectId('6a726c1e780ae942a8d7cbdf');

// Drop cycles > 32
const dropIds = (await db.collection('contestcycles').find({ templateId: tplId, cycleNumber: { $gt: 32 } }, { projection: { _id: 1 } }).toArray()).map(c => c._id);
await db.collection('contestsubmissions').deleteMany({ cycleId: { $in: dropIds } });
await db.collection('contestcycles').deleteMany({ _id: { $in: dropIds } });
console.log('dropped', dropIds.length, 'extra cycles');

// Point activeCycleId at cycle #32 (most recent completed week)
const last = await db.collection('contestcycles').findOne({ templateId: tplId, cycleNumber: 32 });
await db.collection('contesttemplates').updateOne({ _id: tplId }, { $set: { activeCycleId: last._id, isPaused: true } });
console.log('set activeCycleId to #32, paused template to prevent auto-spawn');

const cycles = await db.collection('contestcycles').countDocuments({ templateId: tplId });
const subs = await db.collection('contestsubmissions').countDocuments({ templateId: tplId });
console.log(`FINAL: ${cycles} cycles, ${subs} submissions`);
await mongoose.disconnect();
