import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * DELETE /api/members/me/achievements/[itemId]
 * Auth: signed-in member only. Removes one achievement from the actor's own profile.
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
            { $pull: { achievements: { _id: itemId } } },
            { new: true, projection: { achievements: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ ok: true, achievements: updated.achievements || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/members/me/achievements/[itemId]
 * Updates an achievement.
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
        const { title, issuer, date, link } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email, "achievements._id": itemId },
            {
                $set: {
                    "achievements.$.title": title.trim(),
                    "achievements.$.issuer": (issuer || '').trim(),
                    "achievements.$.date": (date || '').trim(),
                    "achievements.$.link": (link || '').trim(),
                }
            },
            { new: true, projection: { achievements: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Achievement or Member not found' }, { status: 404 });
        }

        const item = updated.achievements.find(a => String(a._id) === String(itemId));
        return NextResponse.json(item);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}