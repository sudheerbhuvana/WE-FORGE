import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, default: '' },
    points: { type: Number, default: 0 },
    slots: { type: Number, default: 50 },
    registeredCount: { type: Number, default: 0 },
    registrationDeadline: { type: Date },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    eventDate: { type: Date, required: true },
    venue: { type: String, default: '' },
    status: { type: String, default: 'upcoming' },
    posterUrl: { type: String, default: '' },
    // Domain that owns / created this event. Drives domain-head permissions.
    domain: { type: String, default: '' },
    // Advanced Access
    accessType: { type: String, enum: ['public', 'domain', 'private'], default: 'public' },
    allowedDomains: { type: [String], default: [] },
    allowedMembers: { type: [String], default: [] }, // Roll numbers
    roles: { type: [String], default: ['Participant', 'Volunteer', 'Organizer'] },
    isRegistrationOpen: { type: Boolean, default: true },

    // Custom registration form fields (mirrors ContestTemplate.customFields).
    // Admins can require extra info on top of the basic name/roll/email
    // (e.g. project links, resume PDF, team details, dropdowns, etc.).
    customFields: [
        {
            id: { type: String, required: true },
            label: { type: String, required: true },
            type: {
                type: String,
                enum: ['text', 'textarea', 'number', 'email', 'image', 'video', 'file', 'link', 'select'],
                default: 'text',
            },
            required: { type: Boolean, default: false },
            placeholder: { type: String, default: '' },
            maxSizeMB: { type: Number, default: 10 },
            maxCount: { type: Number, default: 1 },
            options: { type: [String], default: [] },
        },
    ],

    // Certificate template paths (PDFs uploaded via admin UI).
    // winner.pdf is used for winner / runner_up / third_place.
    // participant.pdf is used for participants.
    certificateTemplateWinner: { type: String, default: '/templates/certificates/winner.pdf' },
    certificateTemplateParticipant: { type: String, default: '/templates/certificates/participant.pdf' },

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
