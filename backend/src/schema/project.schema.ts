import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type ProjectDocument = Project & Document;

@Schema()
export class ProjectConfig {
  @Prop()
  canvasBg?: string;

  @Prop()
  backgroundColor?: string;

  @Prop()
  nodeBg?: string;

  // other props
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  ownerId: User;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  config?: ProjectConfig;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
