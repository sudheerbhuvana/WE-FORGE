import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requirePermission, canManageWallOfKL } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const getDirPath = () => path.join(process.cwd(), 'public', 'media', 'contest-selected');

export async function GET(req) {
  try {
    const dirPath = getDirPath();

    let filenames = [];
    try {
      filenames = await fs.readdir(dirPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        filenames = [];
      } else {
        throw err;
      }
    }

    let metadata = {};
    const metadataPath = path.join(dirPath, 'metadata.json');
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metaContent);
    } catch (e) {
      // metadata file doesn't exist
    }

    const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif']);
    const images = [];

    for (const filename of filenames) {
      if (filename.startsWith('.') || filename === 'metadata.json') continue;

      const ext = path.extname(filename).toLowerCase();
      if (!imageExtensions.has(ext)) continue;

      const filePath = path.join(dirPath, filename);
      let stat = { size: 0, mtime: new Date() };
      try {
        stat = await fs.stat(filePath);
      } catch (e) {}

      const imgMeta = metadata[filename] || {};
      const nameWithoutExt = path.basename(filename, ext);
      const defaultTitle = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      images.push({
        id: filename,
        filename,
        title: imgMeta.title || defaultTitle,
        badge: imgMeta.badge || null,
        tag: imgMeta.tag || null,
        author: imgMeta.author || null,
        url: `/media/contest-selected/${encodeURIComponent(filename)}`,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime ? stat.mtime.toISOString() : new Date().toISOString(),
      });
    }

    images.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return NextResponse.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error('Error listing contest-selected media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contest media gallery' },
      { status: 500 }
    );
  }
}

// POST endpoint for updating metadata or uploading a new image to contest-selected
export async function POST(req) {
  const { response } = await requirePermission(canManageWallOfKL);
  if (response) return response;

  try {
    const dirPath = getDirPath();
    await fs.mkdir(dirPath, { recursive: true });

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle Image Upload
      const formData = await req.formData();
      const file = formData.get('file');
      const title = (formData.get('title') || '').toString().trim();
      const badge = (formData.get('badge') || '').toString().trim();
      const author = (formData.get('author') || '').toString().trim();
      const tag = (formData.get('tag') || '').toString().trim();

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filename = `${timestamp}_${safeName}`;
      const filePath = path.join(dirPath, filename);

      await fs.writeFile(filePath, buffer);

      // Save metadata entry
      const metadataPath = path.join(dirPath, 'metadata.json');
      let metadata = {};
      try {
        const metaContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metaContent);
      } catch (e) {}

      metadata[filename] = {
        title: title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        badge: badge || '🏆 CONTEST WINNING CAPTURE',
        author: author || 'KL FORGE Contender',
        tag: tag || 'Official Winner',
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      return NextResponse.json({
        success: true,
        message: 'Image uploaded to Wall of KL successfully',
        filename,
      });
    } else {
      // Handle Metadata Update (JSON)
      const body = await req.json();
      const { filename, title, badge, author, tag } = body;

      if (!filename) {
        return NextResponse.json({ success: false, error: 'Filename is required' }, { status: 400 });
      }

      const metadataPath = path.join(dirPath, 'metadata.json');
      let metadata = {};
      try {
        const metaContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metaContent);
      } catch (e) {}

      metadata[filename] = {
        title: title || metadata[filename]?.title || filename,
        badge: badge || metadata[filename]?.badge || '🏆 CONTEST WINNER',
        author: author || metadata[filename]?.author || '',
        tag: tag || metadata[filename]?.tag || '',
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      return NextResponse.json({
        success: true,
        message: 'Image details updated successfully',
      });
    }
  } catch (error) {
    console.error('Error in Wall of KL POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE endpoint for removing an image from contest-selected
export async function DELETE(req) {
  const { response } = await requirePermission(canManageWallOfKL);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename parameter required' }, { status: 400 });
    }

    const dirPath = getDirPath();
    const filePath = path.join(dirPath, filename);

    try {
      await fs.unlink(filePath);
    } catch (e) {
      // File might not exist
    }

    // Clean up metadata
    const metadataPath = path.join(dirPath, 'metadata.json');
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metaContent);
      if (metadata[filename]) {
        delete metadata[filename];
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      }
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Image removed from Wall of KL' });
  } catch (error) {
    console.error('Error deleting Wall of KL image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
