import mongoose, { Schema, Document } from 'mongoose';

export interface IHistory extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  action: string;
  details: string;
  authorId: string; // User ID or Name
  entityType?: 'node' | 'edge' | 'comment' | 'project';
  entityId?: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  timestamp: Date;
}

const HistorySchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  action: { type: String, required: true },
  details: { type: String },
  authorId: { type: String },
  entityType: { type: String },
  entityId: { type: String },
  previousState: { type: Schema.Types.Mixed },
  newState: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<IHistory>('History', HistorySchema);
