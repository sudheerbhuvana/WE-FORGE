import mongoose from 'mongoose';

const recruitmentSettingsSchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: true },
  title: { type: String, default: 'KLFORGE Recruitment Drive' },
  subtitle: { type: String, default: 'Shape the future of technology, design, media, and leadership.' },
  description: { 
    type: String, 
    default: 'We are looking for passionate, driven students to join our domains. Select your preferred domains, tell us why you want to join, and share your work links.' 
  },
  heroImageUrl: { type: String, default: '' },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.RecruitmentSettings || mongoose.model('RecruitmentSettings', recruitmentSettingsSchema);
