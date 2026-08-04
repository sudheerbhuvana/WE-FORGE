import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MemberSchema = new mongoose.Schema({
  id: String,
  name: String,
  role: String,
  domain: String,
  rollNumber: String,
  department: String,
  email: String,
  description: String,
  bio: String,
  skills: Array,
  telegram: String,
  github: String,
  linkedin: String,
  status: String,
  photoUrl: String,
  orderIndex: Number
}, { timestamps: true });

const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

async function run() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb+srv://praveen:Praveen123@myatlasclusteredu.tsy40ac.mongodb.net/klforge?retryWrites=true&w=majority';

  // Fail fast instead of waiting 30s on DNS / TCP timeouts.
  await mongoose.connect(uri, {
    dbName: 'klforge',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  const csv = fs.readFileSync('forge_members.csv', 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('Name,'));

  // Pull every existing name once — avoids a per-row findOne round trip.
  const existing = new Set(
    (await Member.find({}, { name: 1 }).lean()).map(d => d.name.trim().toLowerCase())
  );
  const startCount = await Member.countDocuments();

  const docs = [];
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    if (parts[0].trim().toLowerCase() === 'name') continue;

    const name = parts[0].trim();
    const email = parts[1].trim();
    let role = parts[2].trim();
    let domain = parts[3].trim();
    const rollNumber = parts[4].trim();

    // Auto-correct if Role and Domain are swapped (e.g. Domain is 'Core Member')
    if (['Core Member', 'Member', 'Lead', 'Chief', 'President'].includes(domain)) {
      const temp = role;
      role = domain;
      domain = temp;
    }

    if (existing.has(name.toLowerCase())) {
      skipped++;
      continue;
    }

    docs.push({
      id: String(Date.now() + Math.random()),
      name,
      email,
      role,
      domain,
      rollNumber,
      department: '',
      description: '',
      bio: '',
      skills: [],
      telegram: '',
      github: '',
      linkedin: '',
      status: 'Online',
      photoUrl: '',
      orderIndex: startCount + docs.length,
    });
  }

  if (docs.length === 0) {
    console.log(`Nothing to insert (${skipped} already existed). Done.`);
    return process.exit(0);
  }

  // One round trip instead of N.
  const inserted = await Member.insertMany(docs, { ordered: false });
  console.log(`Inserted ${inserted.length} new members (${skipped} already existed).`);
  process.exit(0);
}

run().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
