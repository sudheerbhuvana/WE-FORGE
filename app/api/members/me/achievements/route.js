import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * POST /api/members/me/achievements
 * Auth: signed-in member only. Adds an achievement to the actor's own profile.
 * Body: { title, issuer?, date?, link? }
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await request.json();
        const title = String(body.title || '').trim();
        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const item = {
            _id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
            title,
            issuer: String(body.issuer || '').trim(),
            date:   String(body.date   || '').trim(),
            link:   String(body.link   || '').trim(),
            createdAt: new Date(),
        };

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $push: { achievements: item } },
            { new: true, projection: { achievements: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json(item, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}