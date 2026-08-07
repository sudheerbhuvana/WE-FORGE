import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';
import { saveFile, deleteFile } from '@/lib/uploadHelper';
import path from 'path';
import { requirePermission, canManageMember, isElite, hasPermission } from '@/lib/permissions';

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

        if (formData.has('name') && (isElite(actor) || hasPermission(actor, 'members.edit_name'))) target.name = formData.get('name');
        if (formData.has('role') && (isElite(actor) || hasPermission(actor, 'members.edit_domain_role'))) target.role = formData.get('role');
        if (formData.has('domain') && (isElite(actor) || hasPermission(actor, 'members.edit_domain_role'))) target.domain = formData.get('domain');
        if (formData.has('rollNumber') && (isElite(actor) || hasPermission(actor, 'members.edit_roll'))) target.rollNumber = formData.get('rollNumber');
        if (formData.has('department') && (isElite(actor) || hasPermission(actor, 'members.edit_dept'))) target.department = formData.get('department');
        if (formData.has('email') && (isElite(actor) || hasPermission(actor, 'members.edit_email'))) target.email = formData.get('email');
        if (formData.has('description')) target.description = formData.get('description');
        if (formData.has('bio') && (isElite(actor) || hasPermission(actor, 'members.edit_socials'))) target.bio = formData.get('bio');
        if (formData.has('skills') && (isElite(actor) || hasPermission(actor, 'members.edit_skills'))) target.skills = JSON.parse(formData.get('skills'));
        if (formData.has('telegram') && (isElite(actor) || hasPermission(actor, 'members.edit_socials'))) target.telegram = formData.get('telegram');
        if (formData.has('github') && (isElite(actor) || hasPermission(actor, 'members.edit_socials'))) target.github = formData.get('github');
        if (formData.has('linkedin') && (isElite(actor) || hasPermission(actor, 'members.edit_socials'))) target.linkedin = formData.get('linkedin');
        if (formData.has('status')) target.status = formData.get('status');
        if (formData.has('isSuspended') && (isElite(actor) || hasPermission(actor, 'members.suspend'))) target.isSuspended = formData.get('isSuspended') === 'true';
        if (formData.has('customRoleId') && (isElite(actor) || hasPermission(actor, 'roles.assign_users'))) target.customRoleId = formData.get('customRoleId');
        if ((formData.has('cgpa') || formData.has('academicLogs')) && (isElite(actor) || hasPermission(actor, 'members.edit_academics'))) {
            if (formData.has('cgpa')) target.cgpa = Number(formData.get('cgpa'));
        }

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
