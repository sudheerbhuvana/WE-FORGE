import mongoose from 'mongoose';

const submissionFileSchema = new mongoose.Schema({
    fieldId: { type: String, required: true, index: true },
    fieldLabel: { type: String, default: '' },
    fieldType: { type: String, default: '' },
    url: { type: String, required: true },
    s3Key: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    originalName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const workLinkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
}, { _id: false });

const registrationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    eventId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Participant' },
    registeredAt: { type: Date, default: Date.now },

    // Attendance + event-role for certificate issuance.
    attendance: { type: String, enum: ['pending', 'present', 'absent'], default: 'pending', index: true },
    eventRole: { type: String, enum: ['participant', 'winner', 'runner_up', 'third_place'], default: 'participant' },
    certificateId: { type: String, default: null, index: true, sparse: true },
    certificateIssuedAt: { type: Date, default: null },

    // Stored answers to the event's custom form fields.
    // For text/textarea/number/select/email → answer.value
    // For link → answer.workLinks[]
    // For image/video/file → answer.files[]
    customAnswers: [
        {
            fieldId: { type: String },
            label: { type: String },
            type: { type: String },
            value: { type: mongoose.Schema.Types.Mixed },
            workLinks: { type: [workLinkSchema], default: undefined },
            files: { type: [submissionFileSchema], default: undefined },
        },
    ],
});

export default mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
