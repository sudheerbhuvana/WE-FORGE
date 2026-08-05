import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import connectDB from '../lib/db.js';
import ContestCycle from '../lib/models/ContestCycle.js';
import Member from '../lib/models/Member.js';
import ContestSubmission from '../lib/models/ContestSubmission.js';

async function main() {
  await connectDB();
  console.log('Connected to DB');

  const cycles = await ContestCycle.find({});
  console.log(`Checking ${cycles.length} cycles for missing winner names...`);

  for (const c of cycles) {
    if (Array.isArray(c.winners) && c.winners.length > 0) {
      let modified = false;
      for (const w of c.winners) {
        if (!w.name || w.name.trim() === '') {
          console.log(`Winner for cycle ID ${c._id} has memberId: "${w.memberId}" but no name. Looking up...`);
          const mem = await Member.findOne({ $or: [{ memberId: w.memberId }, { rollNumber: w.memberId }] }).lean();
          if (mem) {
            w.name = mem.name || mem.fullName || 'Participant';
            w.email = w.email || mem.email || '';
            w.rollNumber = w.rollNumber || mem.rollNumber || mem.memberId || '';
            console.log(`Resolved member name: "${w.name}", rollNumber: "${w.rollNumber}"`);
            modified = true;
          } else if (w.submissionId) {
            const sub = await ContestSubmission.findById(w.submissionId).lean();
            if (sub) {
              w.name = sub.authorName || 'Participant';
              w.email = w.email || sub.authorEmail || '';
              w.rollNumber = w.rollNumber || sub.authorRollNumber || '';
              console.log(`Resolved submission author name: "${w.name}"`);
              modified = true;
            }
          } else {
            w.name = w.memberId || 'Participant';
            w.rollNumber = w.memberId || '';
            console.log(`Fallback name: "${w.name}"`);
            modified = true;
          }
        }
      }
      if (modified) {
        c.markModified('winners');
        await c.save();
        console.log(`Saved updated winners for cycle ${c._id}`);
      }
    }
  }

  console.log('Done fixing winner names!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
