import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';
import { saveFile } from '@/lib/uploadHelper';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/profile-projects');
const toSlug = (str) =>
    String(str || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'project';

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

/**
 * PUT /api/members/me/projects/[projectId]
 *
 * Updates an existing project.
 */
export async function PUT(request, { params }) {
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
        const formData = await request.formData();

        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const link = String(formData.get('link') || '').trim();
        const removeImage = formData.get('removeImage') === 'true';

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        let imageUrl = null;
        const photoFile = formData.get('image');
        if (photoFile && typeof photoFile === 'object' && photoFile.size > 0) {
            const buffer = await photoFile.arrayBuffer();
            const slug = toSlug(title);
            const id = String(Date.now());
            const ext =
                photoFile.type === 'image/png' ? 'png' :
                photoFile.type === 'image/webp' ? 'webp' :
                'jpg';
            const filename = `${slug}-${id}.${ext}`;
            imageUrl = await saveFile(buffer, photoFile.type, 'profile-projects', UPLOAD_DIR, filename);
        }

        const updateFields = {
            "projects.$.title": title,
            "projects.$.description": description,
            "projects.$.link": link,
        };

        if (removeImage) {
            updateFields["projects.$.imageUrl"] = "";
        } else if (imageUrl !== null) {
            updateFields["projects.$.imageUrl"] = imageUrl;
        }

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email, "projects._id": projectId },
            { $set: updateFields },
            { new: true, projection: { projects: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Project or Member not found' }, { status: 404 });
        }

        const updatedProject = updated.projects.find(p => String(p._id) === String(projectId));
        return NextResponse.json(updatedProject);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}