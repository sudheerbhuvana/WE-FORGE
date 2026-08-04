import mongoose from 'mongoose';

const workLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
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

contestSubmissionSchema.index({ cycleId: 1, memberId: 1 }, { unique: true });

export default mongoose.models.ContestSubmission || mongoose.model('ContestSubmission', contestSubmissionSchema);
