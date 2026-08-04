import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * POST /api/members/me/cgpas
 * Auth: signed-in member only. Adds a CGPA entry to the actor's own profile.
 * Body: { label?, value (number), scale? (default 10) }
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await request.json();
        const value = Number(body.value);
        if (!Number.isFinite(value)) {
            return NextResponse.json({ error: 'CGPA value is required (number)' }, { status: 400 });
        }
        const scale = Number(body.scale) || 10;

        const item = {
            _id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
            label: String(body.label || '').trim(),
            value,
            scale,
            createdAt: new Date(),
        };

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $push: { cgpas: item } },
            { new: true, projection: { cgpas: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json(item, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}