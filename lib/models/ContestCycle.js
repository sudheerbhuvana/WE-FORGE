import mongoose from 'mongoose';

const winnerSchema = new mongoose.Schema({
  rank: { type: Number, required: true }, // 1 = 1st Place, 2 = 2nd Place, 3 = 3rd Place, 99 = Special Mention
  memberId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  rollNumber: { type: String, default: '' },
  awardTitle: { type: String, default: '' }, // e.g. "🥇 1st Place Winner", "Best Visuals"
  judgeNotes: { type: String, default: '' },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContestSubmission' },
}, { _id: false });

const contestCycleSchema = new mongoose.Schema({
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContestTemplate', required: true, index: true },
  templateSlug: { type: String, required: true, index: true },
  cycleNumber: { type: Number, required: true },
  cycleLabel: { type: String, required: true }, // e.g. "Week 31", "August 2026", "One-Time Edition"
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'submission_closed', 'judging', 'results_published', 'archived'], 
    default: 'upcoming',
    index: true
  },
  winners: { type: [winnerSchema], default: [] },
  announcementNotes: { type: String, default: '' },
  resultsPublishedAt: { type: Date },
  participantCount: { type: Number, default: 0 },
  submissionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contestCycleSchema.index({ templateId: 1, cycleNumber: 1 }, { unique: true });

export default mongoose.models.ContestCycle || mongoose.model('ContestCycle', contestCycleSchema);
