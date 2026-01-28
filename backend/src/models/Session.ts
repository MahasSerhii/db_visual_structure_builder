import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    socketId: string;
    roomId: string;
    userId?: string; // Stable ID to prevent duplicates
    userEmail?: string;
    userName: string;
    userColor: string;
    isVisible: boolean;
    connectedAt: Date;
}

const SessionSchema: Schema = new Schema({
    socketId: { type: String, required: true, unique: true },
    roomId: { type: String, required: true },
    userId: { type: String }, // New field
    userEmail: { type: String },
    userName: { type: String, default: 'Guest' },
    userColor: { type: String, default: '#ccc' },
    isVisible: { type: Boolean, default: true },
    connectedAt: { type: Date, default: Date.now }
});

// Auto-expire sessions after 24 hours if something goes wrong with disconnect
SessionSchema.index({ connectedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<ISession>('Session', SessionSchema);
