import mongoose from 'mongoose';

/**
 * Wall of KL gallery entries.
 *
 * The image bytes live in Cloudflare R2 (see lib/r2.js); only this small
 * editable record is kept in Mongo. Both used to live on the container's local
 * filesystem, which is why uploaded captures 404'd in production: Next.js
 * serves `public/` from a build-time static manifest, so a file written at
 * runtime is never registered as a static asset.
 */
const wallOfKLMediaSchema = new mongoose.Schema({
  // e.g. "1792648912818_forge_d2.jpg" — stable per-entry identifier used by the
  // admin UI and the DELETE endpoint.
  filename: { type: String, required: true, unique: true },
  // Public R2 URL for the stored image.
  url: { type: String, required: true },
  // R2 object key, so DELETE doesn't have to re-parse the URL.
  s3Key: { type: String, default: '' },
  title: { type: String, default: '' },
  badge: { type: String, default: '' },
  author: { type: String, default: '' },
  tag: { type: String, default: '' },
  // Optional participant Instagram handle; rendered only when non-empty.
  instagram: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  sizeBytes: { type: Number, default: 0 },
  orderIndex: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.WallOfKLMedia || mongoose.model('WallOfKLMedia', wallOfKLMediaSchema);