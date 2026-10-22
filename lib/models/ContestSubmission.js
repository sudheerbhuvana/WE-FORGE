import mongoose from 'mongoose';

const workLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
}, { _id: false });

// Each uploaded file in a submission (image / video / generic file)
const submissionFileSchema = new mongoose.Schema({
  fieldId: { type: String, required: true, index: true },   // which customField it belongs to
  fieldLabel: { type: String, default: '' },                 // cached label for display
  fieldType: { type: String, default: '' },                 // 'image' | 'video' | 'file'
  url: { type: String, required: true },                    // public URL (R2)
  s3Key: { type: String, default: '' },                     // R2 key for cleanup
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },                   // bytes
  originalName: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const contestSubmissionSchema = new mongoose.Schema({
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContestCycle', required: true, index: true },
  templateSlug: { type: String, required: true, index: true },
  memberId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  rollNumber: { type: String, default: '' },
  title: { type: String, default: 'Contest Entry' },
  description: { type: String, default: '' },

  // 1-based position of this entry among the member's entries for the cycle.
  // Lets the UI say "Entry 2 of 3" without counting on every read.
  entryNumber: { type: Number, default: 1 },

  // Uploaded files (images / videos / generic attachments) per customField.
  // Replaces the old single-string fileUrl. Existing submissions with fileUrl
  // are still readable — see API normalization in submit/route.js.
  files: { type: [submissionFileSchema], default: [] },

  // Legacy single URL field, kept for backward compat with already-submitted entries
  fileUrl: { type: String, default: '' },

  workLinks: { type: [workLinkSchema], default: [] },
  customAnswers: [
    {
      fieldId: { type: String },
      label: { type: String },
      type: { type: String },
      value: { type: mongoose.Schema.Types.Mixed },
    }
  ],
  score: { type: Number, default: 0 },
  judgeFeedback: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// A member may now hold several entries per cycle, bounded at runtime by the
// owning template's `maxSubmissionsPerMember`. This used to be a UNIQUE index on
// { cycleId, memberId }, which capped everyone at one entry per cycle.
// Existing rows stay valid — they are simply no longer constrained. The old
// unique index must be dropped explicitly against the live database; see
// scripts/migrate-multi-submissions.mjs.
contestSubmissionSchema.index({ cycleId: 1, memberId: 1 });
contestSubmissionSchema.index({ cycleId: 1, memberId: 1, entryNumber: 1 });

export default mongoose.models.ContestSubmission || mongoose.model('ContestSubmission', contestSubmissionSchema);