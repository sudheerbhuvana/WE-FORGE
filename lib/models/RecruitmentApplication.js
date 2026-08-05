import mongoose from 'mongoose';

const workLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
}, { _id: false });

const recruitmentApplicationSchema = new mongoose.Schema({
  memberId: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  year: { type: String, required: true }, // e.g., 'Y24', 'Y25', 'Y23'
  primaryDomain: { type: String, required: true },
  secondaryDomain: { type: String, default: '' },
  whyDomain: { type: String, required: true },        // reason for primary domain
  whySecondaryDomain: { type: String, default: '' },  // reason for secondary domain
  workLinks: { type: [workLinkSchema], default: [] },
  status: { 
    type: String, 
    enum: ['pending', 'shortlisted', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  adminNotes: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Ensure one active application per member (upsert behavior)
recruitmentApplicationSchema.index({ memberId: 1 }, { unique: true });

export default mongoose.models.RecruitmentApplication || mongoose.model('RecruitmentApplication', recruitmentApplicationSchema);
