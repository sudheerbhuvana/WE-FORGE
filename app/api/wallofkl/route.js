import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db';
import WallOfKLMedia from '@/lib/models/WallOfKLMedia';
import { requirePermission, isElite, hasPermission } from '@/lib/permissions';
import { uploadToR2, deleteFromR2, isR2Configured } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const LOCAL_DIR = () => path.join(process.cwd(), 'public', 'media', 'contest-selected');
const R2_PREFIX = 'wallofkl';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

const extOf = (name) => path.extname(name || '').toLowerCase();
const isImageName = (name) => IMAGE_EXTS.has(extOf(name));

const sanitizeName = (name) =>
  (name || 'image').replace(/[^a-z0-9.]/gi, '_').toLowerCase().slice(-120);

const toMillis = (value) => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Legacy local-filesystem listing (pre-R2). Kept so a dev machine that still has
 * old captures in public/media/contest-selected shows them instead of an empty
 * wall. In production these would 404, so they are only used when the database
 * has no entries at all.
 */
async function readLegacyLocal(dirPath) {
  try {
    const filenames = await fs.readdir(dirPath);
    const out = [];
    for (const filename of filenames) {
      if (filename.startsWith('.') || filename === 'metadata.json') continue;
      if (!isImageName(filename)) continue;
      const filePath = path.join(dirPath, filename);
      let stat = null;
      try { stat = await fs.stat(filePath); } catch { continue; }
      out.push({
        filename,
        url: `/media/contest-selected/${encodeURIComponent(filename)}`,
        title: path
          .basename(filename, extOf(filename))
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        badge: null,
        tag: null,
        author: null,
        instagram: '',
        sizeBytes: stat.size,
        modifiedAt: stat.mtime ? stat.mtime.toISOString() : new Date().toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const docs = await WallOfKLMedia.find({}).lean();
    const images = docs.map((d) => ({
      id: d.filename,
      filename: d.filename,
      title: d.title || path.basename(d.filename, extOf(d.filename)),
      badge: d.badge || null,
      tag: d.tag || null,
      author: d.author || null,
      instagram: d.instagram || '',
      url: d.url,
      sizeBytes: d.sizeBytes || 0,
      modifiedAt: (d.updatedAt || d.createdAt || new Date()).toISOString(),
    }));

    // Fall back to whatever is still on local disk — dev only. In production
    // `public/` is a build-time manifest, so these files 404 in the browser;
    // listing them would re-introduce the exact broken-image bug being fixed.
    let legacy = [];
    if (images.length === 0 && process.env.NODE_ENV !== 'production') {
      legacy = await readLegacyLocal(LOCAL_DIR());
    }

    const all = [...images, ...legacy];
    all.sort((a, b) => toMillis(b.modifiedAt) - toMillis(a.modifiedAt));

    return NextResponse.json({ success: true, count: all.length, images: all });
  } catch (error) {
    console.error('Error listing Wall of KL media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contest media gallery' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const { actor, response } = await requirePermission(
    (a) => isElite(a) || hasPermission(a, 'wallofkl.upload') || hasPermission(a, 'wallofkl.edit_title')
  );
  if (response) return response;

  try {
    await connectDB();

    const contentType = req.headers.get('content-type') || '';

    // ---- Metadata-only update (JSON) ----
    if (!contentType.includes('multipart/form-data')) {
      const body = await req.json();
      const { filename, title, badge, author, tag, orderIndex, isFeatured, instagram } = body;

      if (!filename) {
        return NextResponse.json({ success: false, error: 'Filename is required' }, { status: 400 });
      }

      const guards = [
        [title, 'wallofkl.edit_title'],
        [badge, 'wallofkl.edit_badge'],
        [author, 'wallofkl.edit_author'],
        [instagram, 'wallofkl.edit_author'], // Instagram counts as author metadata
        [orderIndex, 'wallofkl.reorder'],
        [isFeatured, 'wallofkl.feature'],
      ];
      for (const [value, perm] of guards) {
        if (value !== undefined && !isElite(actor) && !hasPermission(actor, perm)) {
          return NextResponse.json(
            { success: false, error: `Forbidden: Missing ${perm} permission` },
            { status: 403 }
          );
        }
      }

      const existing = await WallOfKLMedia.findOne({ filename });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
      }

      if (title !== undefined) existing.title = typeof title === 'string' ? title.trim() : existing.title;
      if (badge !== undefined) existing.badge = typeof badge === 'string' ? badge.trim() : existing.badge;
      if (author !== undefined) existing.author = typeof author === 'string' ? author.trim() : existing.author;
      if (tag !== undefined) existing.tag = typeof tag === 'string' ? tag.trim() : existing.tag;
      if (instagram !== undefined) existing.instagram = typeof instagram === 'string' ? instagram.trim() : '';
      if (orderIndex !== undefined) existing.orderIndex = Number(orderIndex) || 0;
      if (isFeatured !== undefined) existing.isFeatured = !!isFeatured;
      existing.updatedAt = new Date();
      await existing.save();

      return NextResponse.json({ success: true, message: 'Image details updated successfully' });
    }

    // ---- Upload (multipart) ----
    if (!isElite(actor) && !hasPermission(actor, 'wallofkl.upload')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Missing wallofkl.upload permission' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    if (!isImageName(file.name)) {
      return NextResponse.json(
        { success: false, error: 'Only image files (jpg, png, webp, gif, avif) are allowed' },
        { status: 400 }
      );
    }

    const str = (k) => (formData.get(k) || '').toString().trim();
    const title = str('title');
    const badge = str('badge');
    const author = str('author');
    const tag = str('tag');
    const instagram = str('instagram');

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}_${sanitizeName(file.name)}`;
    const key = `${R2_PREFIX}/${filename}`;
    const useR2 = isR2Configured();

    let url;
    if (useR2) {
      try {
        url = await uploadToR2(buffer, key, file.type || 'image/jpeg');
      } catch (e) {
        return NextResponse.json({ success: false, error: `Upload failed: ${e.message}` }, { status: 500 });
      }
    } else {
      // Dev fallback: R2 env vars missing, write to public/ so `next dev` works.
      const dirPath = LOCAL_DIR();
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, filename), buffer);
      url = `/media/contest-selected/${encodeURIComponent(filename)}`;
    }

    await WallOfKLMedia.create({
      filename,
      url,
      s3Key: useR2 ? key : '',
      title: title || path.basename(file.name, extOf(file.name)).replace(/[-_]/g, ' '),
      // Only store what the admin actually typed — no invented badge/author/tag.
      badge,
      author,
      tag,
      instagram,
      mimeType: file.type || '',
      sizeBytes: buffer.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Image uploaded to Wall of KL successfully',
      filename,
      url,
    });
  } catch (error) {
    console.error('Error in Wall of KL POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { response } = await requirePermission((a) => isElite(a) || hasPermission(a, 'wallofkl.delete'));
  if (response) return response;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter required' }, { status: 400 });
    }

    const doc = await WallOfKLMedia.findOneAndDelete({ filename });

    if (!doc) {
      // Not in Mongo — may be a legacy local file.
      try {
        await fs.unlink(path.join(LOCAL_DIR(), filename));
      } catch {
        /* already gone */
      }
      return NextResponse.json({ success: true, message: 'Image removed from Wall of KL' });
    }

    if (doc.s3Key) {
      await deleteFromR2(doc.s3Key);
    } else {
      try {
        await fs.unlink(path.join(LOCAL_DIR(), filename));
      } catch {
        /* already gone */
      }
    }

    return NextResponse.json({ success: true, message: 'Image removed from Wall of KL' });
  } catch (error) {
    console.error('Error deleting Wall of KL image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}