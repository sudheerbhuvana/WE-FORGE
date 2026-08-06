import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Registration from '@/lib/models/Registration';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const isObjectId = (val) => {
    if (!val || typeof val !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === val;
};

/**
 * POST /api/admin/events/[id]/attendance
 * Body: { updates: [{ registrationId, attendance, eventRole }] }
 *
 * Updates attendance + event role for many registrations at once.
 */
export async function POST(req, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || isDomainHead(actor) || hasPermission(actor, 'events.registrations_edit'));
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;
        const { updates } = await req.json();

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'updates array required' }, { status: 400 });
        }

        const results = [];
        for (const u of updates) {
            const { registrationId, attendance, eventRole } = u;
            if (!registrationId) continue;
            const update = {};
            if (['pending', 'present', 'absent'].includes(attendance)) update.attendance = attendance;
            if (['participant', 'winner', 'runner_up', 'third_place'].includes(eventRole)) {
                update.eventRole = eventRole;
                if (eventRole !== 'participant' && !attendance) {
                    update.attendance = 'present';
                }
            }
            if (Object.keys(update).length === 0) continue;

            const filter = isObjectId(registrationId)
                ? { $or: [{ id: registrationId }, { _id: registrationId }], eventId }
                : { id: registrationId, eventId };

            const r = await Registration.findOneAndUpdate(
                filter,
                { $set: update },
                { new: true }
            ).lean();
            results.push({ registrationId, ok: !!r, doc: r });
        }

        return NextResponse.json({ updated: results.filter(r => r.ok).length, results });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/admin/events/[id]/attendance
 * Returns all registrations with attendance + eventRole populated.
 */
export async function GET(req, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || isDomainHead(actor) || hasPermission(actor, 'events.registrations_view'));
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;
        const regs = await Registration.find({ eventId }).sort({ rollNumber: 1 }).lean();
        const summary = {
            total: regs.length,
            present: regs.filter(r => r.attendance === 'present').length,
            absent: regs.filter(r => r.attendance === 'absent').length,
            pending: regs.filter(r => r.attendance === 'pending').length,
            winners: regs.filter(r => r.eventRole === 'winner').length,
            runners: regs.filter(r => r.eventRole === 'runner_up').length,
            thirds: regs.filter(r => r.eventRole === 'third_place').length,
            certificatesIssued: regs.filter(r => r.certificateId).length,
        };
        return NextResponse.json({ registrations: regs, summary });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
