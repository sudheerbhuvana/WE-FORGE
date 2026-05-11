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
  const uri = process.env.MONGODB_URI || 'mongodb+srv://praveen:Praveen123@myatlasclusteredu.tsy40ac.mongodb.net/klforge?retryWrites=true&w=majority';
  await mongoose.connect(uri, { dbName: 'klforge' });
  const csv = fs.readFileSync('forge_members.csv', 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('Name,'));
  
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    
    // Check if the first line is header just in case
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

    const exists = await Member.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (!exists) {
      console.log(`Adding ${name}...`);
      const count = await Member.countDocuments();
      const newMember = new Member({
        id: String(Date.now() + Math.random()),
        name, email, role, domain, rollNumber,
        department: '', description: '', bio: '', skills: [],
        telegram: '', github: '', linkedin: '', status: 'Online',
        photoUrl: '', orderIndex: count
      });
      await newMember.save();
    }
  }
  console.log('Data synchronization completed!');
  process.exit(0);
}

run().catch(console.error);
