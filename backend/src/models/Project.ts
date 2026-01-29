import mongoose, { Schema, Document } from 'mongoose';

export interface ProjectConfig {
    defaultColors?: {
        canvasBg?: string;
        nodeBg?: string;
        [key: string]: string | undefined;
    };
    // Explicitly exclude userProfile from config as it should be local only
    userProfile?: never;
    [key: string]: unknown;
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: string;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  description?: string;
  // backgroundColor moved to config
  config?: ProjectConfig; // JSON config snapshot
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String },
  // backgroundColor removed. stored in config.
  config: { type: Schema.Types.Mixed },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
