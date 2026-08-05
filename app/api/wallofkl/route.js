import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const dirPath = path.join(process.cwd(), 'public', 'media', 'contest-selected');

    let filenames = [];
    try {
      filenames = await fs.readdir(dirPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Ensure directory exists if missing
        await fs.mkdir(dirPath, { recursive: true });
        filenames = [];
      } else {
        throw err;
      }
    }

    const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif']);

    const images = [];

    for (const filename of filenames) {
      if (filename.startsWith('.')) continue; // skip hidden files like .gitkeep

      const ext = path.extname(filename).toLowerCase();
      if (!imageExtensions.has(ext)) continue;

      const filePath = path.join(dirPath, filename);
      let stat = { size: 0, mtime: new Date() };
      try {
        stat = await fs.stat(filePath);
      } catch (e) {
        // ignore
      }

      // Convert filename to pretty title (e.g. "event-showcase-1.jpg" -> "Event Showcase 1")
      const nameWithoutExt = path.basename(filename, ext);
      const title = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      images.push({
        id: filename,
        filename,
        title,
        url: `/media/contest-selected/${encodeURIComponent(filename)}`,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime ? stat.mtime.toISOString() : new Date().toISOString(),
      });
    }

    // Sort newest modified first
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
