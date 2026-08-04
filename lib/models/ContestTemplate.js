import mongoose from 'mongoose';

const contestTemplateSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { 
    type: String, 
    enum: ['one_time', 'immediate', 'recurring_weekly', 'recurring_monthly'], 
    default: 'one_time' 
  },
  bannerUrl: { type: String, default: '' },
  rules: { type: String, default: '' },
  eligibility: { type: String, default: 'Open to all KL University students.' },
  submissionGuidelines: { type: String, default: '' },
  prizeInfo: { type: String, default: '' },
  tags: { type: [String], default: [] },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  featured: { type: Boolean, default: false },
  
  // Schedule configurations
  schedule: {
    // One-Time
    startDate: { type: Date },
    endDate: { type: Date },
    // Weekly Recurring (0 = Sun, 1 = Mon ... 6 = Sat)
    startDay: { type: Number, default: 0 },
    startTime: { type: String, default: '00:00' },
    endDay: { type: Number, default: 6 },
    endTime: { type: String, default: '23:59' },
    // Monthly Recurring
    startDayOfMonth: { type: Number, default: 1 },
    endDayOfMonth: { type: Number, default: 28 },
  },

  // Fully Custom Form Builder Fields & Limits Config
  customFields: [
    {
      id: { type: String, required: true },
      label: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['text', 'textarea', 'number', 'image', 'video', 'file', 'link', 'select'], 
        default: 'text' 
      },
      required: { type: Boolean, default: false },
      placeholder: { type: String, default: '' },
      maxSizeMB: { type: Number, default: 10 },
      maxCount: { type: Number, default: 1 },
      options: { type: [String], default: [] },
    }
  ],

  isPaused: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  activeCycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContestCycle', default: null },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ContestTemplate || mongoose.model('ContestTemplate', contestTemplateSchema);
