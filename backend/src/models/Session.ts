import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    socketId: string;
    roomId: string;
    userId?: mongoose.Types.ObjectId; // Stable ID to prevent duplicates
    connectedAt: Date;
}

const SessionSchema: Schema = new Schema({
    socketId: { type: String, required: true, unique: true },
    roomId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Changed to ObjectId
    connectedAt: { type: Date, default: Date.now }
});

// Auto-expire sessions after 24 hours if something goes wrong with disconnect
SessionSchema.index({ connectedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model<ISession>('Session', SessionSchema);
