import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';
import { User } from './user.schema';

export type EdgeDocument = Edge & Document;

@Schema({ timestamps: true })
export class Edge {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Project;

  @Prop({ required: true })
  edgeId: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  target: string;

  @Prop()
  label?: string;

  @Prop()
  sourceProp?: string;

  @Prop()
  targetProp?: string;

  @Prop({ default: false })
  animated: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  style?: any;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: User;
}

export const EdgeSchema = SchemaFactory.createForClass(Edge);
