import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';

/**
 * DELETE /api/members/me/projects/[projectId]
 *
 * Auth: signed-in member only. Removes a project from the actor's own profile
 * by its sub-document id.
 */
export async function DELETE(_request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    if (!projectId) {
        return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    try {
        await connectDB();
        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $pull: { projects: { _id: projectId } } },
            { new: true, projection: { projects: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        return NextResponse.json({ ok: true, projects: updated.projects || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}