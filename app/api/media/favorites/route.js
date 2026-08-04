import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import { requirePermission, canManageMedia } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

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

export async function PATCH(req) {
    const { response } = await requirePermission(canManageMedia);
    if (response) return response;

    try {
        await connectDB();
        const { ids, favorite } = await req.json();

        if (!Array.isArray(ids) || typeof favorite !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        await Media.updateMany(
            { _id: { $in: ids } },
            { $set: { favorite } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
