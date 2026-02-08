import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    socketId: string;
    projectId: string; // Renamed from roomId
    userId?: mongoose.Types.ObjectId; // Stable ID to prevent duplicates
    userName?: string;
    userColor?: string;
    userEmail?: string;
    isVisible?: boolean;
    connectedAt: Date;
}

const SessionSchema: Schema = new Schema({
    socketId: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Changed to ObjectId
    userName: { type: String },
    userColor: { type: String },
    userEmail: { type: String },
    isVisible: { type: Boolean, default: true },
    connectedAt: { type: Date, default: Date.now }
});

// Auto-expire sessions after 1 hour if something goes wrong with disconnect and server doesn't restart
SessionSchema.index({ connectedAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model<ISession>('Session', SessionSchema);
