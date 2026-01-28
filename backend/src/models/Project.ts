import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  roomId: string;
  name: string;
  ownerId: mongoose.Schema.Types.ObjectId;
  description?: string;
  backgroundColor?: string;
  config?: any; // JSON config snapshot
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String },
  backgroundColor: { type: String, default: '#f8fafc' },
  config: { type: Schema.Types.Mixed },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
