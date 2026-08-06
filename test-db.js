import connectDB from './lib/db.js';
import Member from './lib/models/Member.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectDB();

  const rollNumber = '2400080210';

  const member = await Member.findOne({
    $or: [{ rollNumber }, { id: rollNumber }],
  });

  if (!member) {
    console.error(`❌  No member found for rollNumber: ${rollNumber}`);
    console.log('   Make sure the user has logged in at least once.');
    process.exit(1);
  }

  console.log(`👤 Found: ${member.name} (${member.email})`);
  console.log(`   Before → role: "${member.role}"  domain: "${member.domain}"`);

  // Push ELITE super-admin role into the roles array (Zero Order / President)
  const alreadyElite = member.roles?.some(
    (r) => r.domain === 'Zero Order' && r.role === 'President'
  );

  if (!alreadyElite) {
    member.roles = member.roles || [];
    member.roles.push({ domain: 'Zero Order', role: 'President' });
  }

  // Also set top-level domain + role so permissions.js isElite() passes immediately
  member.domain = 'Zero Order';
  member.role   = 'President';
  member.isDomainHead = true;

  await member.save();

  console.log(`\n✅ Super-admin granted!`);
  console.log(`   After  → role: "${member.role}"  domain: "${member.domain}"`);
  console.log(`   roles[]: ${JSON.stringify(member.roles)}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
