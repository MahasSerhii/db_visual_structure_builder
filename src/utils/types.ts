import { z } from 'zod';
import { 
    NodePropertySchema, NodeDataSchema, EdgeDataSchema, CommentSchema, 
    CommentReplySchema, UserRoleType as UserRoleTypeEnum, UserSchema, 
    ActiveSessionUserSchema, SavedProjectSchema, AppSettingsSchema, 
    UserProfileSchema, TranslationSchema, RoomAccessUserSchema, 
    LanguageSchema 
} from './schemas';

// Re-export Enums
export { UserRoleTypeEnum as UserRoleType };

// Infer Types from Zod Schemas
export type NodeProperty = z.infer<typeof NodePropertySchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;
export type EdgeData = z.infer<typeof EdgeDataSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CommentReply = z.infer<typeof CommentReplySchema>;
export type User = z.infer<typeof UserSchema>;
export type ActiveSessionUser = z.infer<typeof ActiveSessionUserSchema>;
export type SavedProject = z.infer<typeof SavedProjectSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type RoomAccessUser = z.infer<typeof RoomAccessUserSchema>;
export type Language = z.infer<typeof LanguageSchema>;

