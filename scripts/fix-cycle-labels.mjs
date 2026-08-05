import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import connectDB from '../lib/db.js';
import ContestCycle from '../lib/models/ContestCycle.js';

async function main() {
  await connectDB();
  console.log('Connected to DB');

  const cycles = await ContestCycle.find({});
  console.log(`Found ${cycles.length} cycles`);

  for (const c of cycles) {
    const newLabel = `Edition #${c.cycleNumber}`;
    if (c.cycleLabel !== newLabel) {
      console.log(`Updating Cycle ID ${c._id} (number ${c.cycleNumber}): "${c.cycleLabel}" -> "${newLabel}"`);
      c.cycleLabel = newLabel;
      await c.save();
    }
  }

  console.log('Done updating cycles!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
