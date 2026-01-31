import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  // uid field removed in favor of _id
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  color: string;
  // visible field removed. Visibility is now controlled per-project in Access model only.
  authorized: boolean; // Whether user has completed login/registration
  profileUpdatedAt: Date;
  avatar?: string;
  password?: string; // Add password
  rememberMe?: boolean; // User preference
  createdAt: Date;
  lastActive: Date;
  // Preferences
  language?: string;
  theme?: 'light' | 'dark';
  componentBg?: string;
  propertyText?: string;
  canvasBg?: string;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String }, // Add password
  name: { type: String, required: true },
  color: { type: String, default: '#6366F1' },
  // visible: { type: Boolean, default: true }, // Removed
  authorized: { type: Boolean, default: false }, // false for pre-registered via invite, true after auth
  profileUpdatedAt: { type: Date, default: Date.now },
  rememberMe: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
   avatar: { type: String },
   // Preferences
   language: { type: String, default: 'en' },
   theme: { type: String, enum: ['light', 'dark'], default: 'light' },
   componentBg: { type: String, default: '#6366F1' },
   propertyText: { type: String, default: '#000000' },
   canvasBg: { type: String }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
