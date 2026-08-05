import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';
import Event from '@/lib/models/Event';
import { generateCertificate } from '@/lib/certificateGenerator';
import { checkRateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const BASE = process.env.CERT_BASE_URL || 'http://localhost:3000';

export async function GET(req, { params }) {
    const rateLimit = await checkRateLimit(req, 'certificates');
    if (!rateLimit.allowed) return rateLimit.response;

    try {
        await connectDB();
        const { certId } = await params;

        const cert = await Certificate.findOne({ certificateId: certId }).lean();
        if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
        if (cert.revoked) return NextResponse.json({ error: 'Certificate has been revoked' }, { status: 410 });

        const event = await Event.findOne({ id: cert.eventId }).lean();
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        // Pick template
        let templatePath = '';
        if (cert.eventRole === 'winner') templatePath = event.certificateTemplateWinner || '/templates/certificates/winner.pdf';
        else if (cert.eventRole === 'runner_up' || cert.eventRole === 'third_place') templatePath = event.certificateTemplateWinner || '/templates/certificates/winner.pdf';
        else templatePath = event.certificateTemplateParticipant || '/templates/certificates/participant.pdf';

        const absTemplate = path.join(process.cwd(), 'public', (templatePath || '').replace(/^\//, ''));
        if (!templatePath || !fs.existsSync(absTemplate)) {
            return NextResponse.json({ error: 'Template PDF missing on server' }, { status: 500 });
        }

        const pdfBuf = await generateCertificate({
            templatePath: absTemplate,
            name: cert.name,
            eventName: cert.eventTitle,
            eventRole: cert.eventRole,
            certId: cert.certificateId,
            verifyUrl: `${BASE}/certification/verify/${cert.certificateId}`,
        });

        const dateStr = event.eventDate || event.startTime ? new Date(event.eventDate || event.startTime).toISOString().split('T')[0] : 'unknown-date';
        const safeTitle = cert.eventTitle.replace(/[^a-z0-9]+/gi, '_');
        const filename = `${cert.memberRoll}_${safeTitle}_${dateStr}.pdf`;

        return new NextResponse(pdfBuf, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Content-Length': String(pdfBuf.length),
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
