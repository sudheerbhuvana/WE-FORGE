import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * DELETE /api/members/me/schools/[itemId]
 * Auth: signed-in member only. Removes one school entry from the actor's own profile.
 */
export async function DELETE(_request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    if (!itemId || itemId === 'default-klef') {
        return NextResponse.json({ error: 'Cannot remove default KLEF entry' }, { status: 400 });
    }

    try {
        await connectDB();
        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $pull: { schools: { _id: itemId } } },
            { new: true, projection: { schools: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ ok: true, schools: updated.schools || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/members/me/schools/[itemId]
 * Updates a school/institution entry.
 */
export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    if (!itemId) {
        return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    try {
        await connectDB();
        const body = await request.json();
        const { level, name, boardOrUni, year } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'School name is required' }, { status: 400 });
        }

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email, "schools._id": itemId },
            {
                $set: {
                    "schools.$.level": (level || '').trim(),
                    "schools.$.name": name.trim(),
                    "schools.$.boardOrUni": (boardOrUni || '').trim(),
                    "schools.$.year": (year || '').trim(),
                }
            },
            { new: true, projection: { schools: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'School or Member not found' }, { status: 404 });
        }

        const item = updated.schools.find(s => String(s._id) === String(itemId));
        return NextResponse.json(item);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}