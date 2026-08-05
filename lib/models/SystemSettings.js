import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global_settings', unique: true },
  
  // System Toggles
  signupsEnabled: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  rateLimitingEnabled: { type: Boolean, default: true },

  // Rate Limiting Configurations (window in ms, max requests)
  rateLimits: {
    auth: { windowMs: { type: Number, default: 60000 }, max: { type: Number, default: 10 } },
    api: { windowMs: { type: Number, default: 60000 }, max: { type: Number, default: 100 } },
    upload: { windowMs: { type: Number, default: 60000 }, max: { type: Number, default: 15 } },
    certificates: { windowMs: { type: Number, default: 60000 }, max: { type: Number, default: 30 } },
  },

  maintenanceMessage: { type: String, default: 'The platform is currently undergoing scheduled maintenance. Please check back shortly.' },
  updatedAt: { type: Date, default: Date.now },
});

const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;
