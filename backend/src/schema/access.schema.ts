import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';
import { User } from './user.schema';

export enum UserRole {
  VIEWER = 'Viewer',
  EDITOR = 'Editor',
  ADMIN = 'Admin'
}

@Schema({ _id: false })
export class AccessUser {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ default: false })
  authorised: boolean;

  @Prop({ default: true })
  visible: boolean;

  @Prop({ enum: UserRole, default: UserRole.VIEWER })
  role: string;

  @Prop()
  invitedEmail?: string;

  @Prop()
  joinedAt?: Date;
}

export type AccessDocument = Access & Document;

@Schema({ timestamps: true })
export class Access {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: Project;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId: User;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: [SchemaFactory.createForClass(AccessUser)] })
  access_granted: AccessUser[];
}

export const AccessSchema = SchemaFactory.createForClass(Access);
AccessSchema.index({ projectId: 1 }, { unique: true });
