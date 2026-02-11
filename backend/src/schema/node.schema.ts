import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';
import { User } from './user.schema';

export type NodeDocument = Node & Document;

@Schema()
class NodeProperty {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  type: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  defaultValue?: any;
}

@Schema({ timestamps: true })
export class Node {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Project;

  @Prop({ required: true, index: true })
  nodeId: string;

  @Prop({ default: 'Untitled' })
  title: string;

  @Prop()
  description?: string;

  @Prop({ default: '#6366F1' })
  color: string;

  @Prop({ default: 0 })
  x: number;

  @Prop({ default: 0 })
  y: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data: any;

  @Prop()
  docLink?: string;

  @Prop()
  type?: string;

  @Prop({ type: [SchemaFactory.createForClass(NodeProperty)], default: [] })
  props: NodeProperty[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: User;
}

export const NodeSchema = SchemaFactory.createForClass(Node);
NodeSchema.index({ projectId: 1, nodeId: 1 });
