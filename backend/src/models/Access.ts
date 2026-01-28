import mongoose, { Schema, Document } from 'mongoose';

export interface IAccess extends Document {
  projectId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  role: 'host' | 'admin' | 'writer' | 'viewer';
  invitedEmail?: string; // If user not yet registered
  createdAt: Date;
}

const AccessSchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['host', 'admin', 'writer', 'viewer'], default: 'viewer' },
  invitedEmail: { type: String }
}, { timestamps: true });

export default mongoose.model<IAccess>('Access', AccessSchema);
