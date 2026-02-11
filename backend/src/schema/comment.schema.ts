import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Project;

  @Prop({ required: true })
  commentId: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: 0 })
  x: number;

  @Prop({ default: 0 })
  y: number;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  linkedNodeId?: string;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  color: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  authorId: any;

  @Prop()
  authorName?: string;

  @Prop()
  timestamp?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
