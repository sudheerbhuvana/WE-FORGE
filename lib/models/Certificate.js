import mongoose from 'mongoose';

/**
 * Certificate — every issued event certificate gets one record.
 * certificateId is the public lookup key printed on the PDF + embedded in the QR code.
 */
const certificateSchema = new mongoose.Schema({
    certificateId: { type: String, required: true, unique: true, index: true },
    registrationId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    memberRoll: { type: String, required: true, index: true },
    memberEmail: { type: String, required: true },
    name: { type: String, required: true },
    eventTitle: { type: String, required: true },
    eventRole: { type: String, enum: ['participant', 'winner', 'runner_up', 'third_place'], required: true },
    issuedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
}, { timestamps: true });

certificateSchema.index({ certificateId: 1, revoked: 1 });

export default mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
