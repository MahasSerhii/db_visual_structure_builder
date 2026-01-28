import mongoose, { Schema, Document } from 'mongoose';

export interface IAccess extends Document {
  projectId: mongoose.Schema.Types.ObjectId;
  userId?: mongoose.Schema.Types.ObjectId;
  role: 'host' | 'admin' | 'writer' | 'viewer';
  invitedEmail?: string; // If user not yet registered
  isVisible: boolean; // Visibility per project
  isDeleted: boolean; // Soft delete for removed users
  createdAt: Date;
  updatedAt: Date;
}

const AccessSchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  role: { type: String, enum: ['host', 'admin', 'writer', 'viewer'], default: 'viewer' },
  invitedEmail: { type: String },
  isVisible: { type: Boolean, default: true }, // Per-project visibility
  isDeleted: { type: Boolean, default: false } // Soft delete flag
}, { timestamps: true });

// Index for fast lookups
AccessSchema.index({ projectId: 1, userId: 1 });
AccessSchema.index({ projectId: 1, invitedEmail: 1 });

export default mongoose.model<IAccess>('Access', AccessSchema);
