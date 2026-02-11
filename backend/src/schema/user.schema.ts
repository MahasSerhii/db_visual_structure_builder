import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '#6366F1' })
  color: string;

  @Prop({ default: false })
  authorized: boolean;

  @Prop({ default: Date.now })
  profileUpdatedAt: Date;

  @Prop({ default: false })
  rememberMe: boolean;

  @Prop({ default: Date.now })
  lastActive: Date;

  @Prop()
  avatar?: string;

  // Preferences
  @Prop({ default: 'en' })
  language: string;

  @Prop({ enum: ['light', 'dark'], default: 'light' })
  theme: string;

  @Prop({ default: '#6366F1' })
  componentBg: string;

  @Prop({ default: '#000000' })
  propertyText: string;

  @Prop()
  canvasBg?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
