import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import connectDB from '../lib/db.js';
import ContestCycle from '../lib/models/ContestCycle.js';

async function main() {
  await connectDB();
  const cycle = await ContestCycle.findOne({ templateSlug: 'test' });
  console.log('Cycle status:', cycle?.status);
  console.log('Cycle winners:', JSON.stringify(cycle?.winners, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
