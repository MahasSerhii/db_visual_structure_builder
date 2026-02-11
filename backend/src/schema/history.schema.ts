import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';

export type HistoryDocument = History & Document;

@Schema()
export class History {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Project;

  @Prop({ required: true })
  action: string;

  @Prop()
  details: string;

  @Prop()
  authorId: string;

  @Prop()
  entityType?: string;

  @Prop()
  entityId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  previousState?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newState?: any;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);
