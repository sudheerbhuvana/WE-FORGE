import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/verify/[certId]
 * Public endpoint — returns verification result.
 */
export async function GET(req, { params }) {
    try {
        await connectDB();
        const { certId } = await params;
        const cert = await Certificate.findOne({ certificateId: certId }).lean();
        if (!cert) {
            return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 });
        }
        if (cert.revoked) {
            return NextResponse.json({
                valid: false,
                reason: 'revoked',
                revokedAt: cert.revokedAt,
                revokedReason: cert.revokedReason,
                certificateId: cert.certificateId,
            }, { status: 410 });
        }
        return NextResponse.json({
            valid: true,
            certificate: {
                certificateId: cert.certificateId,
                name: cert.name,
                eventTitle: cert.eventTitle,
                eventRole: cert.eventRole,
                issuedAt: cert.issuedAt,
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
