import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media/folders
 *
 * Public. Returns distinct folder names + counts, sorted by name.
 * Used by the admin sidebar and the move-to picker.
 */
export async function GET() {
    try {
        await connectDB();
        const rows = await Media.aggregate([
            { $group: { _id: '$folder', count: { $sum: 1 }, favorites: { $sum: { $cond: ['$favorite', 1, 0] } } } },
            { $project: { _id: 0, name: '$_id', count: 1, favorites: 1 } },
            { $sort: { name: 1 } },
        ]);
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}