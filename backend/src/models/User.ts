import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  // uid field removed in favor of _id
  email: string;
  name: string;
  color: string;
  visible: boolean;
  authorized: boolean; // Whether user has completed login/registration
  profileUpdatedAt: Date;
  avatar?: string;
  password?: string; // Add password
  rememberMe?: boolean; // User preference
  createdAt: Date;
  lastActive: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String }, // Add password
  name: { type: String, required: true },
  color: { type: String, default: '#6366F1' },
  visible: { type: Boolean, default: true },
  authorized: { type: Boolean, default: false }, // false for pre-registered via invite, true after auth
  profileUpdatedAt: { type: Date, default: Date.now },
  avatar: { type: String },
  rememberMe: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
