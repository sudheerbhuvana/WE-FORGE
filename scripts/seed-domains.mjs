import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Domain from '../lib/models/Domain.js';

const DOMAIN_LIST = [
  { name: 'Zero Order', slug: 'zero-order', description: 'Executive leadership & central admin', icon: 'Crown', color: '#ffffff', orderIndex: 1 },
  { name: 'Technical', slug: 'technical', description: 'Software development, web apps, AI/ML, and system architecture', icon: 'Code', color: '#71C4FF', orderIndex: 2 },
  { name: 'Media & Broadcasting', slug: 'media-broadcasting', description: 'Photography, videography, reels, and media coverage', icon: 'Camera', color: '#f43f5e', orderIndex: 3 },
  { name: 'Operations & Protocol', slug: 'operations-protocol', description: 'Event coordination, ops logistics, and club management', icon: 'Layers', color: '#10b981', orderIndex: 4 },
  { name: 'Creative & Content', slug: 'creative-content', description: 'UI/UX, graphic design, branding, and content creation', icon: 'Palette', color: '#c084fc', orderIndex: 5 },
  { name: 'Advisors', slug: 'advisors', description: 'Strategic mentoring and advisory leadership', icon: 'GraduationCap', color: '#94a3b8', orderIndex: 6 },
  { name: 'Public Speaking', slug: 'public-speaking', description: 'Stage anchoring, workshops, and public relations', icon: 'Mic', color: '#f59e0b', orderIndex: 7 }
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri, { dbName: 'klforge' });
  console.log('Connected to MongoDB.');

  const existing = await Domain.find().lean();
  console.log('Existing domains in DB:', existing.map(d => d.name));

  for (const d of DOMAIN_LIST) {
    await Domain.findOneAndUpdate(
      { slug: d.slug },
      { 
        $set: {
          name: d.name,
          description: d.description,
          icon: d.icon,
          color: d.color,
          orderIndex: d.orderIndex,
          isActive: true
        }
      },
      { upsert: true, new: true }
    );
  }

  const all = await Domain.find().sort({ orderIndex: 1 }).lean();
  console.log('\n✅ Updated Domain List in DB:');
  console.table(all.map(d => ({ Name: d.name, Slug: d.slug, Active: d.isActive, Order: d.orderIndex })));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
