import path from 'path';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';
import Event from '@/lib/models/Event';
import { requirePermission, canManageEvent, isElite, isDomainHead, hasPermission } from '@/lib/permissions';
import { generateCertificate } from '@/lib/certificateGenerator';
export const dynamic = 'force-dynamic';

const BASE = process.env.CERT_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/admin/events/[id]/certificates/zip
 * Streams a ZIP of all PDFs for this event.
 */
export async function GET(req, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || isDomainHead(actor) || hasPermission(actor, 'events.certificates_download_zip'));
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;
        const event = await Event.findOne({ id: eventId }).lean();
        if (!event) return new Response('Event not found', { status: 404 });

        const certs = await Certificate.find({ eventId }).lean();
        if (certs.length === 0) return new Response('No certificates issued', { status: 404 });

        const archiverModule = await import('archiver');
        const archiver = archiverModule.default || archiverModule;

        // Set up streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const archive = archiver('zip', { zlib: { level: 6 } });
                archive.on('data', (chunk) => controller.enqueue(chunk));
                archive.on('end', () => controller.close());
                archive.on('error', (err) => controller.error(err));

                const fs = await import('fs');
                const roleToTpl = {
                    winner: event.certificateTemplateWinner || '/templates/certificates/winner.pdf',
                    runner_up: event.certificateTemplateWinner || '/templates/certificates/winner.pdf',
                    third_place: event.certificateTemplateWinner || '/templates/certificates/winner.pdf',
                    participant: event.certificateTemplateParticipant || '/templates/certificates/participant.pdf',
                };
                const tplCache = {};

                for (const cert of certs) {
                    try {
                        const tplRel = roleToTpl[cert.eventRole] || roleToTpl.participant;
                        const tplPath = path.join(process.cwd(), 'public', (tplRel || '').replace(/^\//, ''));
                        if (!tplCache[tplPath]) {
                            if (!fs.existsSync(tplPath)) {
                                archive.append(`Template missing: ${tplRel}\n`, { name: `MISSING_${cert.certificateId}.txt` });
                                continue;
                            }
                            tplCache[tplPath] = tplPath;
                        }
                        const pdf = await generateCertificate({
                            templatePath: tplPath,
                            name: cert.name,
                            eventName: cert.eventTitle,
                            eventRole: cert.eventRole,
                            certId: cert.certificateId,
                            verifyUrl: `${BASE}/certification/verify/${cert.certificateId}`,
                        });
                        const safeTitle = cert.eventTitle.replace(/[^a-z0-9]+/gi, '_');
                        const dateStr = event.eventDate || event.startTime ? new Date(event.eventDate || event.startTime).toISOString().split('T')[0] : 'unknown-date';
                        const filename = `${cert.eventRole}/${cert.memberRoll}_${safeTitle}_${dateStr}.pdf`;
                        archive.append(pdf, { name: filename });
                    } catch (e) {
                        archive.append(`Error: ${e.message}\n`, { name: `ERROR_${cert.certificateId}.txt` });
                    }
                }

                archive.finalize();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, '_')}_certificates.zip"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
    }
}
