import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';
import { saveFile, deleteFile } from '@/lib/uploadHelper';
import path from 'path';
import { requirePermission, canManageMember } from '@/lib/permissions';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/members');
const nameToSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function PUT(request, { params }) {
    const { id } = await params;

    await connectDB();
    const target = await Member.findOne({ id });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const { response } = await requirePermission(canManageMember, target);
    if (response) return response;

    try {
        const formData = await request.formData();

        if (formData.has('name')) target.name = formData.get('name');
        if (formData.has('role')) target.role = formData.get('role');
        if (formData.has('domain')) target.domain = formData.get('domain');
        if (formData.has('rollNumber')) target.rollNumber = formData.get('rollNumber');
        if (formData.has('department')) target.department = formData.get('department');
        if (formData.has('email')) target.email = formData.get('email');
        if (formData.has('description')) target.description = formData.get('description');
        if (formData.has('bio')) target.bio = formData.get('bio');
        if (formData.has('skills')) target.skills = JSON.parse(formData.get('skills'));
        if (formData.has('telegram')) target.telegram = formData.get('telegram');
        if (formData.has('github')) target.github = formData.get('github');
        if (formData.has('linkedin')) target.linkedin = formData.get('linkedin');
        if (formData.has('status')) target.status = formData.get('status');
        if (formData.has('isSuspended')) target.isSuspended = formData.get('isSuspended') === 'true';
        if (formData.has('customRoleId')) target.customRoleId = formData.get('customRoleId');

        // roles: JSON-encoded array of {domain, role}
        if (formData.has('roles')) {
            try {
                const parsed = JSON.parse(formData.get('roles'));
                if (Array.isArray(parsed)) {
                    target.roles = parsed
                        .filter(r => r && r.domain && r.role)
                        .map(r => ({ domain: String(r.domain), role: String(r.role) }));
                }
            } catch (e) {
                return NextResponse.json({ error: 'Invalid roles JSON' }, { status: 400 });
            }
        }

        const photoFile = formData.get('photo');
        if (photoFile && photoFile.size > 0) {
            await deleteFile(target.photoUrl, UPLOAD_DIR);
            const slug = nameToSlug(target.name);
            const buffer = await photoFile.arrayBuffer();
            const ext = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg';
            const filename = `${slug}.${ext}`;
            target.photoUrl = await saveFile(buffer, photoFile.type, 'members', UPLOAD_DIR, filename);
        }

        await target.save();
        return NextResponse.json(target);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;

    await connectDB();
    const target = await Member.findOne({ id });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'members.delete'));
    if (response) return response;

    try {
        await deleteFile(target.photoUrl, UPLOAD_DIR);
        await Member.deleteOne({ id });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
