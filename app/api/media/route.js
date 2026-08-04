import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media
 *
 * Query params:
 *   favorites=true   → only favorited media (used by landing page)
 *   folder=NAME      → filter by folder
 *   type=image|video → filter by media type
 *   limit=N          → cap results (after sort)
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const onlyFavs = searchParams.get('favorites') === 'true';
    const folder = searchParams.get('folder');
    const type = searchParams.get('type');
    const limit = Number(searchParams.get('limit')) || 0;

    try {
        await connectDB();
        const filter = {};
        if (onlyFavs) filter.favorite = true;
        if (folder && folder !== 'all') filter.folder = folder;
        if (type === 'image' || type === 'video') filter.type = type;

        let q = Media.find(filter).sort({ favorite: -1, createdAt: -1 });
        if (limit > 0) q = q.limit(limit);
        const items = await q;
        // Normalize legacy docs so the admin UI never sees undefined
        const out = items.map((m) => ({
            ...m.toObject(),
            folder: m.folder || m.eventName || 'General',
            favorite: !!m.favorite,
            title: m.title || '',
            description: m.description || '',
            tags: Array.isArray(m.tags) ? m.tags : [],
        }));
        return NextResponse.json(out);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}