/**
 * generate-test-certificates.mjs
 * Generates sample certificates for visual QA — drops them into
 *   public/examples/certificates/<role>-<name>.pdf
 * Run: node scripts/generate-test-certificates.mjs
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { generateCertificate } from '../lib/certificateGenerator.js';
import { generateCertificateId } from '../lib/certId.js';

const OUT_DIR = path.join(process.cwd(), 'public', 'examples', 'certificates');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = process.env.CERT_BASE_URL || 'http://localhost:3000';

const samples = [
    { role: 'winner',       name: 'Aarav Sharma',   event: 'HackForge 2026' },
    { role: 'runner_up',    name: 'Suhana Reddy',   event: 'HackForge 2026' },
    { role: 'third_place',  name: 'Vihaan Patel',   event: 'HackForge 2026' },
    { role: 'participant',  name: 'Ananya Iyer',    event: 'HackForge 2026' },
];

for (const s of samples) {
    const certId = generateCertificateId();
    const verifyUrl = `${BASE}/certification/verify/${certId}`;
    const buf = await generateCertificate({
        name: s.name,
        eventName: s.event,
        eventRole: s.role,
        certId,
        verifyUrl,
    });
    const filename = `${s.role}-${s.name.replace(/\s+/g, '_')}.pdf`;
    fs.writeFileSync(path.join(OUT_DIR, filename), buf);
    console.log(`✓ ${filename}  (${certId})`);
}

console.log(`\nDone — wrote ${samples.length} certs to ${OUT_DIR}`);
