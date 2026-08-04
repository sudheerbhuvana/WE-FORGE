import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Folder || mongoose.model('Folder', folderSchema);
