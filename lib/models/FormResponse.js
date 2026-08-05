import mongoose from 'mongoose';

const formResponseSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
  formSlug: { type: String, required: true, index: true },

  // Submitter info (from session if requiresLogin, else from form fields)
  submittedBy: { type: String, default: '' },       // memberId or anonymous
  submitterName: { type: String, default: '' },
  submitterEmail: { type: String, default: '' },
  submitterRoll: { type: String, default: '' },

  // Responses: { fieldId: value }
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Admin
  status: { type: String, enum: ['pending', 'reviewed', 'flagged'], default: 'pending' },
  adminNotes: { type: String, default: '' },

  submittedAt: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '' },
});

export default mongoose.models.FormResponse || mongoose.model('FormResponse', formResponseSchema);
