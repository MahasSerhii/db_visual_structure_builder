import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Session extends Document {
  @Prop({ required: true })
  socketId: string;

  @Prop({ required: true, index: true })
  projectId: string;

  @Prop()
  userId: string; // Optional (guest)

  @Prop()
  userName: string;

  @Prop()
  userColor: string;

  @Prop({ default: true })
  isVisible: boolean; // For "ghost" mode or similar

  @Prop({ default: Date.now, expires: 86400 }) // Auto-expire for cleanup backup
  createdAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
