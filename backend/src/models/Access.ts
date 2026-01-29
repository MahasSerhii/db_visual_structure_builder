import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessUser {
    userId: mongoose.Types.ObjectId;
    authorised: boolean; // default false, true on first entry
    visible: boolean; // default true
    role: 'Admin' | 'Editor' | 'Viewer';
    invitedEmail?: string; // Optional: keep for reference if needed
    joinedAt?: Date;
}

export interface IAccess extends Document {
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId; // The creator of the room/access list
    isDeleted: boolean;
    access_granted: IAccessUser[];
    createdAt: Date;
    updatedAt: Date;
}

const AccessUserSchema: Schema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorised: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' },
    invitedEmail: { type: String },
    joinedAt: { type: Date }
}, { _id: false }); // sub-docs don't strictly need _id unless we want to query by access-record-id

const AccessSchema: Schema = new Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    access_granted: [AccessUserSchema]
}, { timestamps: true });

// Ensure one Access document per project
AccessSchema.index({ projectId: 1 }, { unique: true });

export default mongoose.model<IAccess>('Access', AccessSchema);
