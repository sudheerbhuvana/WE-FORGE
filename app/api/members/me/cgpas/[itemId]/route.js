import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * DELETE /api/members/me/cgpas/[itemId]
 * Auth: signed-in member only. Removes one CGPA entry from the actor's own profile.
 */
export async function DELETE(_request, { params }) {
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
        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $pull: { cgpas: { _id: itemId } } },
            { new: true, projection: { cgpas: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ ok: true, cgpas: updated.cgpas || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/members/me/cgpas/[itemId]
 * Updates a CGPA entry.
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
        const { semester, cgpa, sgpa, year } = body;

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email, "cgpas._id": itemId },
            {
                $set: {
                    "cgpas.$.semester": (semester || '').trim(),
                    "cgpas.$.cgpa": cgpa !== undefined && cgpa !== null ? Number(cgpa) : null,
                    "cgpas.$.sgpa": sgpa !== undefined && sgpa !== null ? Number(sgpa) : null,
                    "cgpas.$.year": (year || '').trim(),
                }
            },
            { new: true, projection: { cgpas: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'CGPA or Member not found' }, { status: 404 });
        }

        const item = updated.cgpas.find(c => String(c._id) === String(itemId));
        return NextResponse.json(item);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}