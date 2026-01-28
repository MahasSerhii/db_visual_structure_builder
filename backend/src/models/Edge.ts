import mongoose, { Schema, Document } from 'mongoose';

export interface IEdge extends Document {
  projectId: mongoose.Schema.Types.ObjectId;
  edgeId: string;
  source: string; // ID of source node
  target: string; // ID of target node
  label?: string;
  sourceProp?: string;
  targetProp?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Schema.Types.ObjectId;
}

const EdgeSchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  edgeId: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  label: { type: String },
  sourceProp: { type: String },
  targetProp: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<IEdge>('Edge', EdgeSchema);
