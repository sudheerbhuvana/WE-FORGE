import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Registration from '@/lib/models/Registration';
import Event from '@/lib/models/Event';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/events/[id]/export
 * Returns CSV file containing all registrations & custom field answers for the event.
 */
export async function GET(req, { params }) {
    const { response } = await requirePermission(canManageEvent);
    if (response) return response;

    try {
        await connectDB();
        const { id: eventId } = await params;

        const event = await Event.findOne({ id: eventId }).lean();
        const eventTitle = event?.title || 'Event';

        const regs = await Registration.find({ eventId }).sort({ rollNumber: 1 }).lean();

        // Extract custom field labels for dynamic CSV headers
        const customFieldLabels = [];
        if (Array.isArray(event?.customFields)) {
            event.customFields.forEach(f => {
                if (f.label) customFieldLabels.push(f.label);
            });
        }

        const headers = [
            'Registration ID',
            'Name',
            'Roll Number',
            'Email',
            'Attendance',
            'Role / Position',
            'Certificate ID',
            'Registered Date',
            ...customFieldLabels,
        ];

        const sanitize = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = regs.map(r => {
            const answerMap = {};
            if (Array.isArray(r.customAnswers)) {
                r.customAnswers.forEach(a => {
                    if (!a.label) return;
                    if (['image', 'video', 'file'].includes(a.type) && Array.isArray(a.files)) {
                        answerMap[a.label] = a.files.map(f => f.url).join(' | ');
                    } else if (a.type === 'link' && Array.isArray(a.workLinks)) {
                        answerMap[a.label] = a.workLinks.map(l => `${l.title}: ${l.url}`).join(' | ');
                    } else {
                        answerMap[a.label] = a.value || '';
                    }
                });
            }

            const customVals = customFieldLabels.map(label => answerMap[label] || '');

            return [
                r.id,
                r.name,
                r.rollNumber,
                r.email,
                r.attendance || 'pending',
                r.eventRole || 'participant',
                r.certificateId || '',
                r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '',
                ...customVals,
            ].map(sanitize).join(',');
        });

        const csvContent = [headers.map(sanitize).join(','), ...rows].join('\n');
        const filename = `${eventTitle.replace(/[^a-z0-9]+/gi, '_')}_Registrations.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
