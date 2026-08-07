import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import { deleteFromR2 } from '@/lib/r2';
import { requirePermission, canManageMedia, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    const { response } = await requirePermission(a => isElite(a) || hasPermission(a, 'media.view') || hasPermission(a, 'media.download'));
    if (response) return response;

    const { id } = await params;
    await connectDB();
    const media = await Media.findById(id).lean();
    if (!media) return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });

    return NextResponse.json(media);
}

/**
 * PATCH /api/media/[id]
 *
 * Auth: requires media-management permission.
 * Body (any subset): { title?, description?, folder?, favorite? }
 * When `folder` is changed, `eventName` is kept in sync for back-compat.
 */
export async function PATCH(req, { params }) {
    const { actor, response } = await requirePermission(canManageMedia);
    if (response) {
        console.log('[PATCH /api/media/:id] Auth failed:', response.status);
        return response;
    }
    console.log('[PATCH /api/media/:id] Actor:', actor?.email, 'elite:', actor?.domain);

    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();
        console.log('[PATCH /api/media/:id] id:', id, 'body:', JSON.stringify(body));

        const patch = {};
        if (typeof body.title === 'string') {
            if (!isElite(actor) && !hasPermission(actor, 'media.rename')) {
                return NextResponse.json({ error: 'Forbidden: Missing media.rename permission' }, { status: 403 });
            }
            patch.title = body.title.slice(0, 200);
        }
        if (typeof body.description === 'string') patch.description = body.description.slice(0, 1000);
        if (Array.isArray(body.tags)) {
            patch.tags = body.tags
                .filter((t) => typeof t === 'string')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 20);
        }
        if (typeof body.folder === 'string' && body.folder.trim()) {
            const f = body.folder.trim();
            patch.folder = f;
            patch.eventName = f;
        }
        if (typeof body.favorite === 'boolean') patch.favorite = body.favorite;

        console.log('[PATCH /api/media/:id] patch:', JSON.stringify(patch));

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const updated = await Media.findByIdAndUpdate(id, { $set: patch }, { new: true });
        if (!updated) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

        console.log('[PATCH /api/media/:id] updated favorite:', updated.favorite);
        // Invalidate the landing page so it shows updated favorites on next visit
        revalidatePath('/');
        return NextResponse.json(updated);
    } catch (error) {
        console.error('[PATCH /api/media/:id] error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/media/[id]
 *
 * Auth: requires media-management permission.
 * Removes the media doc and its R2 object.
 */
export async function DELETE(req, { params }) {
    const { response } = await requirePermission(a => isElite(a) || hasPermission(a, 'media.delete'));
    if (response) return response;

    try {
        const { id } = await params;
        await connectDB();
        const media = await Media.findById(id);
        if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

        await deleteFromR2(media.s3Key);
        await Media.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}