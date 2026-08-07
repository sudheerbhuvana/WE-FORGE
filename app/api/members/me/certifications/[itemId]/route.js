import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * DELETE /api/members/me/certifications/[itemId]
 * Auth: signed-in member only. Removes one certification from the actor's own profile.
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
            { $pull: { certifications: { _id: itemId } } },
            { new: true, projection: { certifications: 1 } }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        return NextResponse.json({ ok: true, certifications: updated.certifications || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/members/me/certifications/[itemId]
 * Updates a certification.
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
        const { name, issuer, date, credentialUrl } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email, "certifications._id": itemId },
            {
                $set: {
                    "certifications.$.name": name.trim(),
                    "certifications.$.issuer": (issuer || '').trim(),
                    "certifications.$.date": (date || '').trim(),
                    "certifications.$.credentialUrl": (credentialUrl || '').trim(),
                }
            },
            { new: true, projection: { certifications: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Certification or Member not found' }, { status: 404 });
        }

        const item = updated.certifications.find(c => String(c._id) === String(itemId));
        return NextResponse.json(item);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}