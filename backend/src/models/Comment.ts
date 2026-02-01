import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  commentId: string;
  text: string;
  x: number;
  y: number;
  color: string;
  width?: number;
  height?: number;
  linkedNodeId?: string;
  resolved?: boolean;
  authorId: string | mongoose.Types.ObjectId; 
  authorName?: string;
  timestamp?: Date | number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  commentId: { type: String, required: true },
  text: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number },
  height: { type: Number },
  linkedNodeId: { type: String },
  resolved: { type: Boolean, default: false },
  color: { type: String },
  authorId: { type: Schema.Types.Mixed }, // String or ObjectId
  authorName: { type: String },
  timestamp: { type: Date }, // Optional explicit timestamp
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', CommentSchema);
