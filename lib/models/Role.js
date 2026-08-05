import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [] },
  color: { type: String, default: '#71C4FF' },
  isSystem: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
export default Role;
