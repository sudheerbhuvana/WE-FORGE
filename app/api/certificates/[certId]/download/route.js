import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';
import Event from '@/lib/models/Event';
import { generateCertificate } from '@/lib/certificateGenerator';

export const dynamic = 'force-dynamic';

const BASE = process.env.CERT_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/certificates/[certId]/download
 *
 * Public certificate PDF generation/download endpoint.
 * Anyone with a valid certificateId can view & download the authentic PDF.
 */
export async function GET(req, { params }) {
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
        if (cert.eventRole === 'winner') templatePath = event.certificateTemplateWinner;
        else if (cert.eventRole === 'runner_up' || cert.eventRole === 'third_place') templatePath = event.certificateTemplateWinner;
        else templatePath = event.certificateTemplateParticipant;

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

        const filename = `${cert.eventTitle.replace(/[^a-z0-9]+/gi, '_')}_${cert.name.replace(/\s+/g, '_')}_${cert.certificateId}.pdf`;

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
