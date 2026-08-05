import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import connectDB from '../lib/db.js';
import ContestTemplate from '../lib/models/ContestTemplate.js';
import ContestCycle from '../lib/models/ContestCycle.js';

async function main() {
  await connectDB();
  console.log('Connected to DB');

  const templates = await ContestTemplate.find({
    type: { $in: ['one_time', 'immediate'] }
  });

  console.log(`Found ${templates.length} one-time / immediate contest templates`);

  for (const t of templates) {
    const cycles = await ContestCycle.find({ templateId: t._id }).sort({ cycleNumber: 1 });
    if (cycles.length > 1) {
      console.log(`Template "${t.title}" (${t.slug}) has ${cycles.length} cycles. Cleaning up extra cycles...`);
      const firstCycle = cycles[0];
      const extraCycles = cycles.slice(1);

      for (const extra of extraCycles) {
        console.log(`Deleting extra cycle ID ${extra._id} (Cycle #${extra.cycleNumber})`);
        await ContestCycle.findByIdAndDelete(extra._id);
      }

      // Point activeCycleId back to first cycle
      console.log(`Setting template activeCycleId to first cycle ${firstCycle._id}`);
      t.activeCycleId = firstCycle._id;
      await t.save();
    }
  }

  console.log('Done cleaning up one-time contest cycles!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
