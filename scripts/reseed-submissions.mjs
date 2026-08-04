/**
 * reseed-submissions.mjs
 * Recreates submissions + winners for existing weekly-showcase cycles.
 * Run: node scripts/reseed-submissions.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import ContestTemplate from '../lib/models/ContestTemplate.js';
import ContestCycle from '../lib/models/ContestCycle.js';
import ContestSubmission from '../lib/models/ContestSubmission.js';

const SLUG = 'weekly-showcase';
await mongoose.connect(process.env.MONGO_URI, { dbName: 'klforge' });

const tpl = await ContestTemplate.findOne({ slug: SLUG });
if (!tpl) { console.error('No template'); process.exit(1); }

const cycles = await ContestCycle.find({ templateId: tpl._id }).sort({ cycleNumber: 1 });
console.log('cycles found:', cycles.length);

// Wipe existing subs for these cycles
const cIds = cycles.map(c => c._id);
await ContestSubmission.deleteMany({ cycleId: { $in: cIds } });
console.log('wiped existing submissions');

const SAMPLE = [
  ['Aarav Sharma', '2400080021', 'aarav.sharma@kluniversity.in'],
  ['Suhana Reddy', '2400033157', 'suhana.reddy@kluniversity.in'],
  ['Vihaan Patel', '2400080002', 'vihaan.patel@kluniversity.in'],
  ['Ananya Iyer', '2400033155', 'ananya.iyer@kluniversity.in'],
  ['Arjun Kapoor', '2400080030', 'arjun.kapoor@kluniversity.in'],
  ['Diya Mehta', '2400033200', 'diya.mehta@kluniversity.in'],
  ['Rohan Verma', '2400080045', 'rohan.verma@kluniversity.in'],
  ['Ishaani Gupta', '2400033177', 'ishaani.gupta@kluniversity.in'],
  ['Karthik Nair', '2400080091', 'karthik.nair@kluniversity.in'],
  ['Mira Joshi', '2400033244', 'mira.joshi@kluniversity.in'],
  ['Aditya Rao', '2400080073', 'aditya.rao@kluniversity.in'],
  ['Kavya Singh', '2400033266', 'kavya.singh@kluniversity.in'],
];

const TITLES = [
  'Neural Canvas','Quantum Quizzer','Pixel Pioneer','Code Forge','DevDeck','Stackly',
  'Loopify','Sentinel AI','Forge Vision','Atlas Notes','CodeMint','BitForge','Hackpad',
  'KeySmith','Polyglot','ByteWorks','CloudSmith','LayerOne','Cipher Lab','Helix UI',
  'Nimbus','PaperTrail','Tinkerly','Vortex',
];
const DESCS = [
  'A clean, minimal interface focused on accessibility and performance.',
  'Built using a modern stack with offline-first architecture and instant sync.',
  'Designed for student communities — lightweight, fast, easy to extend.',
  'End-to-end prototype with auth, dashboard, and a public landing page.',
  'Realtime collaboration primitives layered on top of a familiar editor.',
];
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}

const TECH_OPTS = ['React', 'Next.js', 'Node.js', 'Python', 'Flutter'];
const COMMENTARY = [
  'Excellent craft and emotional resonance — a clear winner.',
  'Strong execution with thoughtful UX — runner-up.',
  'Solid concept with creative direction — third place.',
];

let totalSubs = 0;

for (let ci = 0; ci < cycles.length; ci++) {
  const cyc = cycles[ci];
  const subCount = 4 + (ci % 9); // 4..12

  const submissions = [];
  for (let i = 0; i < subCount; i++) {
    const p = SAMPLE[(ci * 3 + i) % SAMPLE.length];
    const title = TITLES[(ci * 7 + i) % TITLES.length];
    const desc = DESCS[i % DESCS.length];
    const tech = TECH_OPTS[i % TECH_OPTS.length];
    const ghUrl = `https://github.com/${p[1]}/${slugify(title)}`;

    submissions.push({
      cycleId: cyc._id,
      templateSlug: tpl.slug,
      memberId: p[1],
      name: p[0],
      email: p[2],
      rollNumber: p[1],
      title,
      description: desc,
      workLinks: i % 2 === 0 ? [{ title: 'GitHub Repo', url: ghUrl }] : [],
      customAnswers: [
        { fieldId: 'f1', label: 'Project Title', type: 'text', value: title },
        { fieldId: 'f2', label: 'Description', type: 'textarea', value: desc },
        { fieldId: 'f3', label: 'GitHub URL', type: 'link', value: ghUrl },
        { fieldId: 'f4', label: 'Tech Stack', type: 'select', value: tech },
      ],
      score: Math.max(0, 100 - i * 8 - (ci % 3) * 2),
      status: i === subCount - 1 ? 'rejected' : 'submitted',
      submittedAt: new Date(cyc.startTime.getTime() + 2 * 86400000),
    });
  }

  const inserted = await ContestSubmission.insertMany(submissions);
  totalSubs += subCount;

  const ranked = [...inserted].sort((a, b) => b.score - a.score);
  const winners = ranked.slice(0, 3).map((w, idx) => ({
    rank: idx + 1,
    memberId: w.memberId,
    name: w.name,
    email: w.email,
    submissionId: w._id,
    comment: COMMENTARY[idx],
  }));

  for (const w of winners) {
    await ContestSubmission.findByIdAndUpdate(w.submissionId, {
      $set: { status: 'approved', rank: w.rank, judgeFeedback: w.comment },
    });
  }

  await ContestCycle.findByIdAndUpdate(cyc._id, {
    $set: {
      submissionCount: subCount,
      participantCount: subCount,
      winners,
      status: 'results_published',
    },
  });
}

console.log(`re-seeded ${totalSubs} submissions + winners for ${cycles.length} cycles`);

const last = cycles[cycles.length - 1];
await ContestTemplate.findByIdAndUpdate(tpl._id, { $set: { activeCycleId: last._id } });
console.log('activeCycleId set to cycle #' + last.cycleNumber);

await mongoose.disconnect();
