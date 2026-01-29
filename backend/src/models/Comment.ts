import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  commentId: string;
  text: string;
  x: number;
  y: number;
  color: string;
  authorId: string; // Storing string ID for visual reference or ObjectId?
  // Frontend sends 'author' string sometimes. Let's keep it flexible or map it.
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
  color: { type: String },
  authorId: { type: String }, // Can be 'guest_...' or name
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', CommentSchema);
