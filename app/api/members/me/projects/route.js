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
 * POST /api/members/me/projects
 *
 * Auth: signed-in member only. Adds a project to the actor's own profile.
 * Accepts multipart/form-data with: title, description, link, image.
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const formData = await request.formData();

        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const link = String(formData.get('link') || '').trim();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        let imageUrl = '';
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

        const project = {
            _id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
            title,
            description,
            link,
            imageUrl,
            createdAt: new Date(),
        };

        const updated = await Member.findOneAndUpdate(
            { email: session.user.email },
            { $push: { projects: project } },
            { new: true, projection: { projects: 1 } }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        return NextResponse.json(project, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}