import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import Folder from '@/lib/models/Folder';
import { requirePermission, canManageMedia } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectDB();
        
        // 1. Get virtual folders from existing media
        const mediaFolders = await Media.aggregate([
            { $group: { _id: '$folder', count: { $sum: 1 }, favorites: { $sum: { $cond: ['$favorite', 1, 0] } } } },
            { $project: { _id: 0, name: '$_id', count: 1, favorites: 1 } }
        ]);

        // 2. Get explicit empty folders
        const explicitFolders = await Folder.find({}).lean();
        
        // 3. Merge them uniquely by name
        const folderMap = new Map();
        
        // Add explicit folders first (with 0 count)
        for (const f of explicitFolders) {
            folderMap.set(f.name, { name: f.name, count: 0, favorites: 0 });
        }
        
        // Merge media folders (updating counts if they overlap)
        for (const m of mediaFolders) {
            if (!m.name) continue;
            if (folderMap.has(m.name)) {
                const existing = folderMap.get(m.name);
                existing.count += m.count;
                existing.favorites += m.favorites;
            } else {
                folderMap.set(m.name, m);
            }
        }
        
        const sortedFolders = Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        return NextResponse.json(sortedFolders);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    const { response } = await requirePermission(canManageMedia);
    if (response) return response;

    try {
        await connectDB();
        const body = await req.json();
        
        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }
        
        const folderName = body.name.trim();
        
        // Create or ignore if exists
        try {
            await Folder.create({ name: folderName });
        } catch (err) {
            if (err.code !== 11000) throw err; // Ignore duplicate key errors
        }

        return NextResponse.json({ success: true, name: folderName });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
