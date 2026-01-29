import mongoose, { Schema, Document } from 'mongoose';

export interface INodeProperty {
    id: string;
    name: string;
    type: string;
    defaultValue?: string | number | boolean;
    [key: string]: unknown;
}

export interface INode extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  nodeId: string; // The FE UUID
  title: string;
  description?: string;
  color: string;
  x: number;
  y: number;
  docLink?: string;
  props: INodeProperty[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NodeSchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  nodeId: { type: String, required: true, index: true }, // Not unique globally, but unique per project (composite index below)
  title: { type: String, default: 'Untitled' },
  description: { type: String },
  color: { type: String, default: '#6366F1' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  docLink: { type: String },
  props: { type: [Schema.Types.Mixed], default: [] },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Composite Index for uniqueness logic if needed, but since we support history, maybe not strict unique on nodeId
// But actively, (projectId, nodeId) should be unique where isDeleted: false
NodeSchema.index({ projectId: 1, nodeId: 1 }, { unique: false }); 

export default mongoose.model<INode>('Node', NodeSchema);
