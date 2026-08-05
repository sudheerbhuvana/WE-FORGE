import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },           // unique field key
  type: { 
    type: String, 
    enum: ['text', 'textarea', 'email', 'number', 'phone', 'url', 'select', 'radio', 'checkbox', 'date', 'file'],
    required: true 
  },
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },       // for select/radio/checkbox
  minLength: { type: Number, default: null },
  maxLength: { type: Number, default: null },
  helpText: { type: String, default: '' },
}, { _id: false });

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  fields: { type: [fieldSchema], default: [] },

  // Settings
  isPublished: { type: Boolean, default: false },
  requiresLogin: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false },   // allow same user to submit multiple times
  
  // Limits
  maxResponses: { type: Number, default: null },      // null = unlimited
  closeAt: { type: Date, default: null },             // auto-close date

  // Appearance
  coverImageUrl: { type: String, default: '' },
  successMessage: { type: String, default: 'Thank you! Your response has been recorded.' },

  // Meta
  createdBy: { type: String, default: '' },
  responseCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Form || mongoose.model('Form', formSchema);
