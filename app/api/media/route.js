import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import { uploadToR2 } from '@/lib/r2';
import { requirePermission, canManageMedia } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

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
        const out = items.map((m) => {
            const derivedTitle = m.title || (() => {
                const rawKey = m.s3Key || m.url || '';
                const filename = rawKey.split('/').pop() || '';
                return filename.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
            })();
            return {
                ...m.toObject(),
                folder: m.folder || m.eventName || 'General',
                favorite: !!m.favorite,
                title: derivedTitle,
                description: m.description || '',
                tags: Array.isArray(m.tags) ? m.tags : [],
            };
        });
        return NextResponse.json(out);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/media
 * Upload media file
 */
export async function POST(req) {
  const { actor, response } = await requirePermission(canManageMedia);
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folderName = (formData.get('folder') || formData.get('eventName') || 'General').toString().trim() || 'General';
    const rawTitle = (formData.get('title') || '').toString().trim().slice(0, 200);
    const description = (formData.get('description') || '').toString().trim().slice(0, 1000);
    
    // Support both JSON stringified tags array or comma separated string
    const rawTags = formData.get('tags');
    let tags = [];
    if (rawTags) {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) tags = parsed;
      } catch (e) {
        tags = rawTags.toString().split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      }
    }

    const favoriteRaw = formData.get('favorite');
    const favorite = favoriteRaw === 'true' || favoriteRaw === 'on' || favoriteRaw === '1';

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const type = mimeType.startsWith('video/') ? 'video' : 'image';

    const fileTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const title = rawTitle || fileTitle;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const key = `media/${folderName.replace(/\s+/g, '_')}/${timestamp}_${safeName}`;

    let url = `/uploads/${key}`;
    try {
      url = await uploadToR2(buffer, key, mimeType);
    } catch (err) {
      console.warn('R2 upload failed, using fallback key path:', err.message);
    }

    await connectDB();
    const newMedia = await Media.create({
      url,
      type,
      eventName: folderName,
      folder: folderName,
      title,
      description,
      tags,
      favorite,
      s3Key: key,
      fileSize: file.size,
      mimeType,
      uploadedBy: actor ? actor.email : 'admin',
    });

    if (favorite) revalidatePath('/');
    return NextResponse.json(newMedia);
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}