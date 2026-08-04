import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * POST /api/members/me/certifications
 * Auth: signed-in member only. Adds a certification to the actor's own profile.
 * Body: { name, issuer?, issued?, credentialUrl? }
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await request.json();
        const name = String(body.name || '').trim();
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const item = {
            _id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
            name,
            issuer: String(body.issuer || '').trim(),
            issued: String(body.issued || '').trim(),
            credentialUrl: String(body.credentialUrl || '').trim(),
            createdAt: new Date(),
        };

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $push: { certifications: item } },
            { new: true, projection: { certifications: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json(item, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}