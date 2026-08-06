import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import { requirePermission, canManageMedia } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/media/bulk
 *
 * Auth: requires media-management permission.
 * Body: { ids: string[], action: 'favorite' | 'unfavorite' | 'move', folder?, favorite? }
 */
export async function POST(req) {
    const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'media.move') || hasPermission(a, 'media.star'));
    if (response) return response;

    try {
        await connectDB();
        const { ids, action, folder, favorite } = await req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'ids[] required' }, { status: 400 });
        }

        if (action === 'move' && !isElite(actor) && !hasPermission(actor, 'media.move')) {
            return NextResponse.json({ error: 'Forbidden: Missing media.move permission' }, { status: 403 });
        }
        if ((action === 'favorite' || action === 'unfavorite') && !isElite(actor) && !hasPermission(actor, 'media.star')) {
            return NextResponse.json({ error: 'Forbidden: Missing media.star permission' }, { status: 403 });
        }

        const set = {};
        if (action === 'favorite')    set.favorite = true;
        else if (action === 'unfavorite') set.favorite = false;
        else if (action === 'move') {
            if (!folder || !String(folder).trim()) {
                return NextResponse.json({ error: 'folder required for move' }, { status: 400 });
            }
            set.folder = String(folder).trim();
            set.eventName = String(folder).trim();
        } else if (action === 'set') {
            if (typeof favorite === 'boolean') set.favorite = favorite;
            if (folder && String(folder).trim()) {
                set.folder = String(folder).trim();
                set.eventName = String(folder).trim();
            }
        } else {
            return NextResponse.json({ error: 'unknown action' }, { status: 400 });
        }

        if (Object.keys(set).length === 0) {
            return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
        }

        const result = await Media.updateMany(
            { _id: { $in: ids } },
            { $set: set }
        );

        return NextResponse.json({ ok: true, modified: result.modifiedCount });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}