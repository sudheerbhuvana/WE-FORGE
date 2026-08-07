import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Registration from '@/lib/models/Registration';
import Certificate from '@/lib/models/Certificate';
import { requirePermission, canManageEvent, isElite, isDomainHead, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const isObjectId = (val) => {
    if (!val || typeof val !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === val;
};

const buildIdCondition = (val) => {
    if (isObjectId(val)) return { $or: [{ id: val }, { _id: val }] };
    return { id: val };
};

/**
 * POST /api/admin/events/[id]/certificates/revoke
 * Body: { registrationId?: string, registrationIds?: string[], certificateId?: string }
 *
 * Revokes issued certificates (single or bulk) and clears certificate links from registrations.
 */
export async function POST(req, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || isDomainHead(actor) || hasPermission(actor, 'events.certificates_revoke') || hasPermission(actor, 'events.certificates_issue'));
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;
        const body = await req.json().catch(() => ({}));
        const { registrationId, registrationIds, certificateId } = body;

        let targetRegs = [];

        if (Array.isArray(registrationIds) && registrationIds.length > 0) {
            // Bulk revoke by registration IDs
            const conditions = registrationIds.map(buildIdCondition);
            targetRegs = await Registration.find({ eventId, $or: conditions });
        } else if (registrationId) {
            targetRegs = await Registration.find({ eventId, ...buildIdCondition(registrationId) });
        } else if (certificateId) {
            targetRegs = await Registration.find({ eventId, certificateId });
        } else {
            // Revoke all certificates for this event if requested without IDs
            targetRegs = await Registration.find({ eventId, certificateId: { $ne: null } });
        }

        if (!targetRegs || targetRegs.length === 0) {
            return NextResponse.json({ error: 'No matching registrations found to revoke' }, { status: 404 });
        }

        const revokedCertIds = [];
        const registrationIdsRevoked = [];

        for (const reg of targetRegs) {
            if (reg.certificateId) {
                revokedCertIds.push(reg.certificateId);
                await Certificate.updateOne(
                    { certificateId: reg.certificateId },
                    { $set: { revoked: true, revokedAt: new Date(), revokedReason: 'Revoked by admin' } }
                );
            }
            reg.certificateId = null;
            reg.certificateIssuedAt = null;
            await reg.save();
            registrationIdsRevoked.push(reg.id || String(reg._id));
        }

        return NextResponse.json({
            revoked: true,
            revokedCount: registrationIdsRevoked.length,
            registrationIds: registrationIdsRevoked,
            revokedCertIds,
            message: `Successfully revoked ${registrationIdsRevoked.length} certificate(s).`,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
