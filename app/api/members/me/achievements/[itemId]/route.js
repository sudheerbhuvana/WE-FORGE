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