import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
export const dynamic = 'force-dynamic';
import Registration from '@/lib/models/Registration';
import Event from '@/lib/models/Event';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export async function GET(request, { params }) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { response } = await requirePermission(canManageEvent, event);
    if (response) return response;

    try {
        const registrations = await Registration.find({ eventId: id }).sort({ registeredAt: -1 });
        return NextResponse.json(registrations);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { response } = await requirePermission(canManageEvent, event);
    if (response) return response;

    try {
        const { registrationId, role } = await request.json();
        if (!registrationId || !role) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

        const updated = await Registration.findOneAndUpdate(
            { id: registrationId, eventId: id },
            { $set: { role } },
            { new: true }
        );

        if (!updated) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
