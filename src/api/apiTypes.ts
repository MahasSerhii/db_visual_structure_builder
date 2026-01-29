import { z } from 'zod';
import { 
    AuthResponseSchema, UserResponseSchema, GraphDataResponseSchema, 
    SyncGraphRequestSchema, UpdateProfileRequestSchema,
    SaveProjectRequestSchema, VerifyAccessRequestSchema, VerifyAccessResponseSchema,
    AuthUserSchema
} from './schemas';

export interface ApiResponse<T = void> {
    data: T;
    message?: string;
}

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type GraphDataResponse = z.infer<typeof GraphDataResponseSchema>;
export type SyncGraphRequest = z.infer<typeof SyncGraphRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type SaveProjectRequest = z.infer<typeof SaveProjectRequestSchema>;
export type VerifyAccessRequest = z.infer<typeof VerifyAccessRequestSchema>;
export type VerifyAccessResponse = z.infer<typeof VerifyAccessResponseSchema>;

