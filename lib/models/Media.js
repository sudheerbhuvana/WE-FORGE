import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
    url:          { type: String, required: true },
    thumbnailUrl: { type: String },                       // for video previews
    type:         { type: String, enum: ['image', 'video'], default: 'image' },
    title:        { type: String, default: '' },          // auto-derived from filename on upload
    description:  { type: String, default: '' },          // longer caption for the lightbox
    tags:         { type: [String], default: [] },        // user-supplied tags (e.g. "opening, key, 2025")
    folder:       { type: String, default: 'General' },   // group key — defaults to the legacy eventName
    eventName:    { type: String, default: 'General' },   // legacy alias, kept for back-compat
    favorite:     { type: Boolean, default: false },      // starred for landing page
    s3Key:        { type: String, required: true },
    fileSize:     { type: Number },
    mimeType:     { type: String },
    width:        { type: Number },
    height:       { type: Number },
    uploadedBy:   { type: String },
    createdAt:    { type: Date, default: Date.now },
});

mediaSchema.set('toJSON', { virtuals: true });
mediaSchema.set('toObject', { virtuals: true });

export default mongoose.models.Media || mongoose.model('Media', mediaSchema);