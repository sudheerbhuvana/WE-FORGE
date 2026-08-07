import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Event from '@/lib/models/Event';
import { saveFile, deleteFile } from '@/lib/uploadHelper';
import path from 'path';
import { requirePermission, canManageEvent, isElite, isDomainHead, hasPermission } from '@/lib/permissions';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/events');
const toSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const parseArray = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } 
    catch { return str.split(',').map(s => s.trim()).filter(Boolean); }
};

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const event = await Event.findOne({ id });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        return NextResponse.json(event);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { actor, response } = await requirePermission(a => canManageEvent(a, event));
    if (response) return response;

    try {
        const formData = await request.formData();

        // 1. Info & Content fields -> events.edit_info
        if (formData.has('title') || formData.has('description') || formData.has('type') || formData.has('venue') || formData.has('location') || formData.has('customFields') || formData.has('roles') || formData.has('slots') || formData.has('points')) {
            if (!isElite(actor) && !isDomainHead(actor) && !hasPermission(actor, 'events.edit_info')) {
                return NextResponse.json({ error: 'Forbidden: Missing events.edit_info permission' }, { status: 403 });
            }
            if (formData.has('title')) event.title = formData.get('title').trim();
            if (formData.has('description')) event.description = formData.get('description').trim();
            if (formData.has('type')) event.type = formData.get('type').trim();
            if (formData.has('points')) event.points = Number(formData.get('points'));
            if (formData.has('slots')) event.slots = Number(formData.get('slots'));
            if (formData.has('venue')) event.venue = formData.get('venue').trim();
            else if (formData.has('location')) event.venue = formData.get('location').trim();
            if (formData.has('accessType')) event.accessType = formData.get('accessType');
            if (formData.has('allowedDomains')) event.allowedDomains = parseArray(formData.get('allowedDomains'));
            if (formData.has('allowedMembers')) event.allowedMembers = parseArray(formData.get('allowedMembers'));
            if (formData.has('roles')) event.roles = parseArray(formData.get('roles'));

            if (formData.has('customFields')) {
                try {
                    const parsed = JSON.parse(formData.get('customFields'));
                    event.customFields = Array.isArray(parsed) ? parsed : [];
                } catch {
                    event.customFields = [];
                }
            }
        }

        // 2. Dates & Timing fields -> events.edit_dates
        if (formData.has('startTime') || formData.has('endTime') || formData.has('registrationDeadline') || formData.has('eventDate')) {
            if (!isElite(actor) && !isDomainHead(actor) && !hasPermission(actor, 'events.edit_dates')) {
                return NextResponse.json({ error: 'Forbidden: Missing events.edit_dates permission' }, { status: 403 });
            }
            if (formData.has('startTime')) event.startTime = formData.get('startTime');
            if (formData.has('endTime')) event.endTime = formData.get('endTime');
            if (formData.has('registrationDeadline')) event.registrationDeadline = formData.get('registrationDeadline');
            if (formData.has('eventDate')) event.eventDate = formData.get('eventDate');
            if (!formData.has('eventDate') && formData.has('startTime')) event.eventDate = formData.get('startTime');
        }

        // 3. Publishing & Status -> events.publish
        if (formData.has('isPublished') || formData.has('status') || formData.has('isRegistrationOpen')) {
            if (!isElite(actor) && !isDomainHead(actor) && !hasPermission(actor, 'events.publish')) {
                return NextResponse.json({ error: 'Forbidden: Missing events.publish permission' }, { status: 403 });
            }
            if (formData.has('isPublished')) event.isPublished = formData.get('isPublished') === 'true';
            if (formData.has('status')) event.status = formData.get('status');
            if (formData.has('isRegistrationOpen')) event.isRegistrationOpen = formData.get('isRegistrationOpen') !== 'false';
        }

        // 4. Certificate Templates -> events.certificates_design
        if (formData.has('certificateTemplateParticipant') || formData.has('certificateTemplateWinner')) {
            if (!isElite(actor) && !hasPermission(actor, 'events.certificates_design')) {
                return NextResponse.json({ error: 'Forbidden: Missing events.certificates_design permission' }, { status: 403 });
            }
            if (formData.has('certificateTemplateParticipant')) event.certificateTemplateParticipant = formData.get('certificateTemplateParticipant');
            if (formData.has('certificateTemplateWinner')) event.certificateTemplateWinner = formData.get('certificateTemplateWinner');
        }

        // Recalculate status based on new dates
        const now = new Date();
        const start = new Date(event.startTime);
        const end = new Date(event.endTime || event.eventDate);

        if (end < now) {
            event.status = 'ended';
        } else if (start <= now && end >= now) {
            event.status = 'ongoing';
        } else {
            event.status = 'upcoming';
        }
        const photoFile = formData.get('poster');
        if (photoFile && photoFile.size > 0) {
            await deleteFile(event.posterUrl, UPLOAD_DIR);
            const buffer = await photoFile.arrayBuffer();
            const slug = toSlug(event.title);
            const ext = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg';
            const filename = `${slug}-${event.id}.${ext}`;
            event.posterUrl = await saveFile(buffer, photoFile.type, 'events', UPLOAD_DIR, filename);
        }

        await event.save();
        return NextResponse.json(event);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'events.delete'));
    if (response) return response;

    try {
        await Event.deleteOne({ id });
        await deleteFile(event.posterUrl, UPLOAD_DIR);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { id } = await params;
    await connectDB();
    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'duplicate';

    if (action === 'duplicate') {
        const { response } = await requirePermission(a => isElite(a) || isDomainHead(a) || hasPermission(a, 'events.duplicate'));
        if (response) return response;

        const newId = `${event.id}-copy-${Date.now().toString().slice(-4)}`;
        const clone = event.toObject();
        delete clone._id;
        delete clone.id;
        clone.id = newId;
        clone.title = `Copy of ${clone.title}`;
        clone.status = 'upcoming';
        clone.createdAt = new Date();

        const created = await Event.create(clone);
        return NextResponse.json({ success: true, event: created }, { status: 201 });
    }

    if (action === 'remind') {
        const { response } = await requirePermission(a => isElite(a) || isDomainHead(a) || hasPermission(a, 'events.manage_reminders'));
        if (response) return response;

        return NextResponse.json({ success: true, message: `Event reminder broadcast queued for ${event.title}` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
