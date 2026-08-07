import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connectDB from "@/lib/db";
import Media from "@/lib/models/Media";
import { uploadToR2 } from "@/lib/r2";
import { requirePermission, canManageMedia, isElite, hasPermission } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function POST(req) {
  const rateLimit = await checkRateLimit(req, 'upload');
  if (!rateLimit.allowed) return rateLimit.response;

  const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'media.upload_images') || hasPermission(a, 'media.upload_videos') || hasPermission(a, 'media.upload_documents'));
  if (response) return response;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const eventName = (formData.get('eventName') || 'General').toString().trim() || 'General';
    const rawTitle = (formData.get('title') || '').toString().trim().slice(0, 200);
    const description = (formData.get('description') || '').toString().trim().slice(0, 1000);
    const rawTags = (formData.get('tags') || '').toString().trim();
    const tags = rawTags
      ? rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20)
      : [];
    const favoriteRaw = formData.get('favorite');
    const favorite = favoriteRaw === 'true' || favoriteRaw === 'on' || favoriteRaw === '1';

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (tags.length === 0) {
      return NextResponse.json({ error: 'At least one tag is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const type = mimeType.startsWith('video/') ? 'video' : 'image';

    // Derive a clean human-readable title from the original filename if the
    // client didn't supply one (strips extension + replaces separators).
    const fileTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const title = rawTitle || fileTitle;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const key = `media/${eventName.replace(/\s+/g, '_')}/${timestamp}_${safeName}`;

    const url = await uploadToR2(buffer, key, mimeType);

    await connectDB();
    const newMedia = await Media.create({
      url,
      type,
      eventName,
      folder: eventName, // mirror folder for new uploads
      title,
      description,
      tags,
      favorite,
      s3Key: key,
      fileSize: file.size,
      mimeType,
      uploadedBy: actor.email,
    });

    // Invalidate landing page cache so new favorites appear
    if (favorite) revalidatePath('/');
    return NextResponse.json(newMedia);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
