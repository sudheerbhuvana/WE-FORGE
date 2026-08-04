/**
 * seed-sample-contest.mjs
 * ─────────────────────────────────────────────────────────────
 * Seeds a "Weekly Showcase" sample contest with 15 historical cycles
 * (each cycle = 1 week, dated before Aug 5, 2026), each with:
 *   - 3 winners (1st / 2nd / 3rd)
 *   - 4-12 submissions with custom fields filled in
 *   - realistic participant counts
 *
 * Idempotent: skips if a contest with slug `weekly-showcase` already exists.
 *
 * Run:  node scripts/seed-sample-contest.mjs
 * ─────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ContestTemplate from '../lib/models/ContestTemplate.js';
import ContestCycle from '../lib/models/ContestCycle.js';
import ContestSubmission from '../lib/models/ContestSubmission.js';

const SLUG = 'weekly-showcase';
const CUTOFF = new Date('2026-08-05T00:00:00.000Z'); // all cycles strictly before this

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/klforge';

// ── helpers ─────────────────────────────────────────────────────────────
const SAMPLE_NAMES = [
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
  ['Reyansh Bose', '2400080103', 'reyansh.bose@kluniversity.in'],
  ['Tara Saxena', '2400033265', 'tara.saxena@kluniversity.in'],
  ['Aditya Rao', '2400080112', 'aditya.rao@kluniversity.in'],
  ['Priya Bhatt', '2400033289', 'priya.bhatt@kluniversity.in'],
  ['Kabir Malhotra', '2400080128', 'kabir.malhotra@kluniversity.in'],
  ['Anika Choudhury', '2400033302', 'anika.choudhury@kluniversity.in'],
  ['Veer Trivedi', '2400080145', 'veer.trivedi@kluniversity.in'],
  ['Saanvi Pillai', '2400033333', 'saanvi.pillai@kluniversity.in'],
  ['Ayaan Khan', '2400080160', 'ayaan.khan@kluniversity.in'],
  ['Riya Subramanian', '2400033356', 'riya.subramanian@kluniversity.in'],
  ['Vivaan Joshi', '2400080173', 'vivaan.joshi@kluniversity.in'],
  ['Myra Pandey', '2400033371', 'myra.pandey@kluniversity.in'],
  ['Sai Kulkarni', '2400080186', 'sai.kulkarni@kluniversity.in'],
  ['Avni Banerjee', '2400033392', 'avni.banerjee@kluniversity.in'],
  ['Arnav Chopra', '2400080201', 'arnav.chopra@kluniversity.in'],
];

const ENTRY_TITLES = [
  'Midnight in Mumbai',
  'Echoes of the Coast',
  'Neon Reflections',
  'Fragments of Tomorrow',
  'Beneath the Banyan',
  'Letters Never Sent',
  'Static & Signal',
  'Paper Lanterns',
  'Tides of June',
  'Wires and Wonder',
  'Concrete Garden',
  'Saffron Dusk',
  'Voices from the Block',
  'Drift',
  'After the Rain',
  'Hollow City',
  'Spectrum',
  'Quiet Frequencies',
  'Burnt Edges',
  'Mosaic',
];

const DESCRIPTIONS = [
  'A short film exploring the unspoken rhythm of late-night commutes.',
  'Documenting the coastal communities that the city tends to forget.',
  'Streets after rain, captured on a 35mm with one roll of Tri-X.',
  'A photo essay on what we choose to leave behind.',
  'Documentary on the last banyan tree standing in our neighbourhood.',
  'Archival work, scanned letters, and the people who wrote them.',
  'Generative poster series interpreting the city\'s electrical hum.',
  'Hand-bound zine of cyanotypes made over one rainy weekend.',
  'Slow cinema piece about waiting and the sea.',
  'Stop-motion built from discarded electronics.',
  'A wandering essay on the plants that grow through pavement.',
  'Long-exposure photography from the old city rooftops.',
  'Field recordings and portraits from one block in the city.',
  'A six-minute meditation on impermanence.',
  'Portraits shot in available light the morning after the storm.',
  'Documentary about the city that disappears after dark.',
  'Wide-format work that asks what colour is left when you strip it down.',
  'A short on the sound of empty rooms.',
  'A collection of unsent messages typed on a typewriter.',
  'A grid of small moments, each one a window.',
];

const PROJECT_LINKS = [
  { title: 'Behance', url: 'https://behance.net/sample-project' },
  { title: 'GitHub', url: 'https://github.com/sample/repo' },
  { title: 'Drive', url: 'https://drive.google.com/drive/folders/sample' },
];

const SAMPLE_LINKS_ALT = [
  { title: 'Figma', url: 'https://figma.com/community/file/sample' },
  { title: 'Vimeo', url: 'https://vimeo.com/sample' },
  { title: 'Notion', url: 'https://notion.so/sample-writeup' },
];

// ── main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 Connecting to', MONGO_URI.replace(/\/\/[^@]*@/, '//***@'));
  await mongoose.connect(MONGO_URI, { dbName: 'klforge' });
  console.log('✅ Connected to klforge db');

  // Idempotency check
  const existing = await ContestTemplate.findOne({ slug: SLUG });
  if (existing) {
    console.log(`⚠️  Contest "${SLUG}" already exists — aborting (no changes made).`);
    console.log(`   Title: ${existing.title}`);
    console.log(`   Cycles: ${await ContestCycle.countDocuments({ templateSlug: SLUG })}`);
    console.log(`   Submissions: ${await ContestSubmission.countDocuments({ templateSlug: SLUG })}`);
    await mongoose.disconnect();
    return;
  }

  // ── Build template ──
  console.log('\n📝 Creating ContestTemplate...');
  const customFields = [
    { id: 'cf_title', label: 'Project / Entry Title', type: 'text', required: true, placeholder: 'e.g. Midnight in Mumbai', maxSizeMB: 10, maxCount: 1, options: [] },
    { id: 'cf_desc', label: 'Detailed Description', type: 'textarea', required: true, placeholder: 'Tell us about your entry', maxSizeMB: 10, maxCount: 1, options: [] },
    { id: 'cf_image', label: 'Poster / Image Upload', type: 'image', required: true, placeholder: '', maxSizeMB: 12, maxCount: 3, options: [] },
    { id: 'cf_links', label: 'Work Links (GitHub, Figma, Drive)', type: 'link', required: false, placeholder: '', maxSizeMB: 10, maxCount: 3, options: [] },
  ];

  const template = await ContestTemplate.create({
    slug: SLUG,
    title: 'Weekly Showcase',
    description: 'A weekly open creative challenge — submit a project, photo, illustration, or short film every Sunday. Community votes + judges pick three winners each cycle. Permanent URL, fresh theme every week, automatic cycle reset.',
    type: 'recurring_weekly',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&q=80',
    rules: '1. One submission per cycle per member.\n2. Original work only — no AI-generated content.\n3. Submissions close every Saturday at 23:59 IST.\n4. Community vote weights 30%, judges\' score weights 70%.\n5. Winners announced Sunday at 18:00 IST.',
    eligibility: 'Open to all KL Forge members. Cross-domain submissions welcome.',
    submissionGuidelines: 'Upload up to 3 high-quality images (JPG/PNG, max 12MB each) and 3 work links (Behance, GitHub, Figma, Drive, etc). Write a 2-3 sentence description of your project.',
    prizeInfo: '🥇 1st: Featured on the Forge landing page for one week + 50 Forge Points\n🥈 2nd: 30 Forge Points\n🥉 3rd: 15 Forge Points\nTop 10 receive the "Weekly Showcase" badge on their profile.',
    tags: ['weekly', 'showcase', 'creative', 'open', 'community'],
    visibility: 'public',
    featured: true,
    isPublished: true,
    schedule: {
      startDay: 0,  // Sunday
      startTime: '00:00',
      endDay: 6,    // Saturday
      endTime: '23:59',
    },
    customFields,
  });
  console.log(`   ✅ Template created (${template._id})`);

  // ── Build 15 historical cycles, dated weekly ending Sat Aug 1, 2026 ──
  // Week 32 (Aug 2-8) is the most recent, all earlier weeks go backwards.
  const cycles = [];
  const totalCycles = 15;
  const anchorEnd = new Date('2026-08-01T23:59:00.000Z'); // last Saturday before cutoff
  for (let i = 0; i < totalCycles; i++) {
    const cycleNumber = 32 - i; // 32, 31, 30, ...
    const endTime = new Date(anchorEnd.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const startTime = new Date(endTime.getTime() - 6 * 24 * 60 * 60 * 1000); // previous Sunday

    // Make sure start is before end (it is by 6 days)
    // ISO week label like "Week 32"
    const cycleLabel = `Week ${cycleNumber}`;

    cycles.push({
      templateId: template._id,
      templateSlug: SLUG,
      cycleNumber,
      cycleLabel,
      startTime,
      endTime,
      status: i === 0 ? 'active' : 'results_published',
      participantCount: 0, // will update after submissions
      submissionCount: 0,
      resultsPublishedAt: i === 0 ? null : new Date(endTime.getTime() + 18 * 60 * 60 * 1000), // Sun 18:00
      announcementNotes: i === 0 ? null : `Winners announced. Theme: ${themeForCycle(cycleNumber)}. Thanks to everyone who participated — ${Math.floor(Math.random() * 30) + 50} entries this week.`,
    });
  }

  const createdCycles = await ContestCycle.insertMany(cycles);
  console.log(`   ✅ Created ${createdCycles.length} cycles (Weeks 18-32)`);

  // ── For each completed cycle, create submissions + winners ──
  console.log('\n🎨 Generating submissions per cycle...');
  let totalSubs = 0;
  for (let idx = 0; idx < createdCycles.length; idx++) {
    const cycle = createdCycles[idx];
    if (cycle.status !== 'results_published') continue;

    // Pick 6-12 participants per cycle (varies to feel realistic)
    const targetCount = 6 + Math.floor(((idx * 7) % 7) + (idx % 3));
    const seed = (cycleNumber) => {
      // deterministic-ish pick from pool
      const pool = [...SAMPLE_NAMES];
      const picked = [];
      for (let k = 0; k < targetCount && pool.length; k++) {
        const i = (cycleNumber * 13 + k * 31 + k * k) % pool.length;
        picked.push(pool.splice(i, 1)[0]);
      }
      return picked;
    };

    const participants = seed(cycle.cycleNumber);
    const submissions = participants.map((p, i) => {
      const title = ENTRY_TITLES[(cycle.cycleNumber * 3 + i * 5) % ENTRY_TITLES.length];
      const desc = DESCRIPTIONS[(cycle.cycleNumber * 7 + i * 11) % DESCRIPTIONS.length];
      const links = i % 2 === 0 ? PROJECT_LINKS : SAMPLE_LINKS_ALT;

      const score = Math.max(40, 100 - i * 6 + (i % 2 === 0 ? 3 : -2));
      const submittedAt = new Date(cycle.startTime.getTime() + (i + 1) * 6 * 60 * 60 * 1000 + Math.random() * 3 * 60 * 60 * 1000);

      return {
        cycleId: cycle._id,
        templateSlug: SLUG,
        memberId: p[1],
        email: p[2],
        name: p[0],
        rollNumber: p[1],
        title,
        description: desc,
        files: [
          {
            fieldId: 'cf_image',
            fieldLabel: 'Poster / Image Upload',
            fieldType: 'image',
            url: `https://picsum.photos/seed/${SLUG}-${cycle.cycleNumber}-${i}/1200/800`,
            s3Key: '',
            mimeType: 'image/jpeg',
            fileSize: 800000 + i * 50000,
            originalName: `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
          },
        ],
        workLinks: links.slice(0, 2 + (i % 2)),
        customAnswers: [
          { fieldId: 'cf_title', label: 'Project / Entry Title', type: 'text', value: title },
          { fieldId: 'cf_desc', label: 'Detailed Description', type: 'textarea', value: desc },
          { fieldId: 'cf_image', label: 'Poster / Image Upload', type: 'image', value: undefined, files: [{
            fieldId: 'cf_image', fieldLabel: 'Poster / Image Upload', fieldType: 'image',
            url: `https://picsum.photos/seed/${SLUG}-${cycle.cycleNumber}-${i}/1200/800`,
            s3Key: '', mimeType: 'image/jpeg', fileSize: 800000,
            originalName: `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
          }] },
          { fieldId: 'cf_links', label: 'Work Links', type: 'link', value: undefined, workLinks: links.slice(0, 2 + (i % 2)) },
        ],
        score,
        judgeFeedback: i < 3 ? `Strong ${['concept', 'execution', 'storytelling'][i]} — keep pushing this direction.` : '',
        status: i === 0 && participants.length > 6 ? 'approved' : (i === participants.length - 1 ? 'rejected' : 'submitted'),
        submittedAt,
        updatedAt: submittedAt,
      };
    });

    // Sort by score desc, take top 3 as winners
    const ranked = [...submissions].sort((a, b) => b.score - a.score);
    const winners = [];
    const winnerSubs = ranked.slice(0, 3);
    for (let k = 0; k < winnerSubs.length; k++) {
      const w = winnerSubs[k];
      winners.push({
        rank: k + 1,
        memberId: w.memberId,
        name: w.name,
        email: w.email,
        rollNumber: w.rollNumber,
        awardTitle: ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'][k],
        judgeNotes: [
          'Excellent craft and emotional resonance — a clear winner.',
          'Strong execution with room to push the concept further next week.',
          'Beautiful work that stands out for its restraint and intent.',
        ][k],
        submissionId: w._id,
      });
    }

    // Insert submissions first (so we have their _ids for winners)
    const inserted = await ContestSubmission.insertMany(submissions);
    // Map back to attach _ids to winners
    const memberIdToSub = new Map(inserted.map((s) => [s.memberId, s]));
    for (const w of winners) {
      const sub = memberIdToSub.get(w.memberId);
      if (sub) w.submissionId = sub._id;
    }

    // Update cycle with winners + counts
    cycle.winners = winners;
    cycle.submissionCount = inserted.length;
    cycle.participantCount = inserted.length;
    await cycle.save();

    totalSubs += inserted.length;
  }

  // Active cycle (idx 0) — just submissions, no winners yet
  const activeCycle = createdCycles[0];
  const activePool = SAMPLE_NAMES.slice(0, 9);
  const activeSubs = activePool.map((p, i) => {
    const title = ENTRY_TITLES[(activeCycle.cycleNumber * 3 + i * 5) % ENTRY_TITLES.length];
    const desc = DESCRIPTIONS[(activeCycle.cycleNumber * 7 + i * 11) % DESCRIPTIONS.length];
    const links = i % 2 === 0 ? PROJECT_LINKS : SAMPLE_LINKS_ALT;
    const score = Math.floor(Math.random() * 30) + 60;
    const submittedAt = new Date(activeCycle.startTime.getTime() + (i + 1) * 8 * 60 * 60 * 1000);
    return {
      cycleId: activeCycle._id,
      templateSlug: SLUG,
      memberId: p[1],
      email: p[2],
      name: p[0],
      rollNumber: p[1],
      title,
      description: desc,
      files: [{
        fieldId: 'cf_image', fieldLabel: 'Poster / Image Upload', fieldType: 'image',
        url: `https://picsum.photos/seed/${SLUG}-${activeCycle.cycleNumber}-${i}/1200/800`,
        s3Key: '', mimeType: 'image/jpeg', fileSize: 800000,
        originalName: `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      }],
      workLinks: links.slice(0, 2 + (i % 2)),
      customAnswers: [
        { fieldId: 'cf_title', label: 'Project / Entry Title', type: 'text', value: title },
        { fieldId: 'cf_desc', label: 'Detailed Description', type: 'textarea', value: desc },
        { fieldId: 'cf_image', label: 'Poster / Image Upload', type: 'image', value: undefined, files: [{
          fieldId: 'cf_image', fieldLabel: 'Poster / Image Upload', fieldType: 'image',
          url: `https://picsum.photos/seed/${SLUG}-${activeCycle.cycleNumber}-${i}/1200/800`,
          s3Key: '', mimeType: 'image/jpeg', fileSize: 800000,
          originalName: `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        }] },
        { fieldId: 'cf_links', label: 'Work Links', type: 'link', value: undefined, workLinks: links.slice(0, 2 + (i % 2)) },
      ],
      score,
      judgeFeedback: '',
      status: 'submitted',
      submittedAt,
      updatedAt: submittedAt,
    };
  });
  await ContestSubmission.insertMany(activeSubs);
  activeCycle.submissionCount = activeSubs.length;
  activeCycle.participantCount = activeSubs.length;
  await activeCycle.save();
  totalSubs += activeSubs.length;

  // ── Set the active cycle on the template ──
  template.activeCycleId = activeCycle._id;
  await template.save();

  // ── Summary ──
  console.log('\n────────────────────────────────────────');
  console.log(`✅ Seed complete`);
  console.log(`   Contest:  /contests/${SLUG}`);
  console.log(`   Cycles:   ${createdCycles.length} (Week ${createdCycles[createdCycles.length - 1].cycleNumber} → Week ${activeCycle.cycleNumber})`);
  console.log(`   Winners:  ${(createdCycles.length - 1) * 3} (top 3 in each completed cycle)`);
  console.log(`   Subs:     ${totalSubs}`);
  console.log('────────────────────────────────────────');

  await mongoose.disconnect();
}

function themeForCycle(cycleNumber) {
  const themes = [
    'Light & Shadow', 'Movement', 'Memory', 'Texture',
    'Neighbourhood', 'Time', 'Sound', 'Object',
    'Portrait', 'Color', 'Pattern', 'Threshold',
    'Ritual', 'Stranger', 'Document', 'Echo',
    'Frame', 'Letter', 'Lost', 'Found',
  ];
  return themes[cycleNumber % themes.length];
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});