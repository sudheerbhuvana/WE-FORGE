import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media/favorites
 *
 * Public. Returns only favorited media, sorted newest first.
 * Capped at 24 by default.
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 24, 48);
    try {
        await connectDB();
        const items = await Media.find({ favorite: true })
            .sort({ createdAt: -1 })
            .limit(limit);
        const out = items.map((m) => ({
            ...m.toObject(),
            folder: m.folder || m.eventName || 'General',
            title: m.title || '',
            description: m.description || '',
            tags: Array.isArray(m.tags) ? m.tags : [],
        }));
        return NextResponse.json(out);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}