import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Registration from '@/lib/models/Registration';
import Event from '@/lib/models/Event';
import Certificate from '@/lib/models/Certificate';
import { requirePermission, canManageEvent } from '@/lib/permissions';
import { generateCertificateId } from '@/lib/certId';
import { generateCertificate } from '@/lib/certificateGenerator';

export const dynamic = 'force-dynamic';

const BASE = process.env.CERT_BASE_URL || 'http://localhost:3000';

const isObjectId = (val) => {
    if (!val || typeof val !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === val;
};

const buildIdCondition = (val) => {
    if (isObjectId(val)) return { $or: [{ id: val }, { _id: val }] };
    return { id: val };
};

function pickTemplatePath(event, eventRole) {
    let rel = '';
    if (eventRole === 'winner') rel = event.certificateTemplateWinner || '/templates/certificates/winner.pdf';
    else if (eventRole === 'runner_up' || eventRole === 'third_place') rel = event.certificateTemplateWinner || '/templates/certificates/winner.pdf';
    else rel = event.certificateTemplateParticipant || '/templates/certificates/participant.pdf';
    if (!rel) return null;
    if (rel.startsWith('/')) rel = rel.slice(1);
    return path.join(process.cwd(), 'public', rel);
}

/**
 * POST /api/admin/events/[id]/certificates/issue
 * Body: { registrationIds?: string[] } — if omitted, issue for ALL registrations for this event.
 *
 * Automatically sets attendance: 'present' and persists certificate record.
 * If a certificate already existed, it revokes the old certificate and generates a fresh one
 * reflecting the current role/position.
 */
export async function POST(req, { params }) {
    const { response } = await requirePermission(canManageEvent);
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;
        const body = await req.json().catch(() => ({}));
        const onlyIds = Array.isArray(body.registrationIds) ? body.registrationIds : null;

        const event = await Event.findOne({ id: eventId }).lean();
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        // Find candidates
        let candidates = [];
        if (onlyIds && onlyIds.length) {
            const conditions = onlyIds.map(buildIdCondition);
            candidates = await Registration.find({ eventId, $or: conditions }).lean();
        } else {
            candidates = await Registration.find({ eventId }).lean();
        }

        const issued = [];
        const skipped = [];

        for (const reg of candidates) {
            try {
                const regKey = reg.id || String(reg._id);
                const templatePath = pickTemplatePath(event, reg.eventRole || 'participant');
                if (!templatePath || !fs.existsSync(templatePath)) {
                    skipped.push({ registrationId: regKey, reason: 'template_missing', templatePath });
                    continue;
                }

                // If old cert exists, mark it as revoked so fresh one replaces it
                if (reg.certificateId) {
                    await Certificate.updateOne(
                        { certificateId: reg.certificateId },
                        { $set: { revoked: true, revokedAt: new Date(), revokedReason: 'Re-issued with updated details' } }
                    );
                }

                const certId = generateCertificateId();
                const verifyUrl = `${BASE}/certification/verify/${certId}`;
                await generateCertificate({
                    templatePath,
                    name: reg.name,
                    eventName: event.title,
                    eventRole: reg.eventRole || 'participant',
                    certId,
                    verifyUrl,
                });

                // Create new Certificate record
                await Certificate.create({
                    certificateId: certId,
                    registrationId: String(regKey),
                    eventId,
                    memberRoll: reg.rollNumber,
                    memberEmail: reg.email,
                    name: reg.name,
                    eventTitle: event.title,
                    eventRole: reg.eventRole || 'participant',
                    issuedAt: new Date(),
                    revoked: false,
                });

                // Update Registration in DB: set attendance to 'present' and attach new certificateId
                await Registration.updateOne(
                    { _id: reg._id },
                    { $set: { attendance: 'present', certificateId: certId, certificateIssuedAt: new Date() } }
                );

                issued.push({
                    registrationId: regKey,
                    name: reg.name,
                    certificateId: certId,
                    eventRole: reg.eventRole || 'participant',
                    downloadUrl: `/api/certificates/${certId}/download?token=${regKey}`,
                    verifyUrl,
                });
            } catch (e) {
                skipped.push({ registrationId: reg.id || String(reg._id), reason: 'error', message: e.message });
            }
        }

        return NextResponse.json({ issued, skipped, issuedCount: issued.length });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
