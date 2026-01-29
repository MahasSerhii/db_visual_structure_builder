import { z } from 'zod';
import { AppSettingsSchema, NodeDataSchema, EdgeDataSchema, CommentSchema } from '../utils/schemas';

// --- Auth Schemas ---

export const AuthUserSchema = z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
    color: z.string().optional(),
    profileUpdatedAt: z.number().optional()
});

export const AuthResponseSchema = z.object({
    token: z.string(),
    user: AuthUserSchema,
    projects: z.array(z.record(z.string(), z.unknown())).optional() 
});

export const UserResponseSchema = z.object({
    user: AuthUserSchema
});

export const UpdateProfileRequestSchema = z.object({
    name: z.string(),
    color: z.string(),
    profileUpdatedAt: z.number()
});

// --- Graph Schemas ---

export const GraphProjectSchema = z.object({
    _id: z.string(),
    name: z.string(),
    ownerId: z.string(),
    isPublic: z.boolean(),
    config: AppSettingsSchema.optional()
});

export const GraphDataResponseSchema = z.object({
    project: GraphProjectSchema,
    nodes: z.array(NodeDataSchema),
    edges: z.array(EdgeDataSchema),
    comments: z.array(CommentSchema),
    history: z.array(z.record(z.string(), z.unknown())).optional()
});

export const SyncGraphRequestSchema = z.object({
    nodes: z.array(NodeDataSchema),
    edges: z.array(EdgeDataSchema),
    comments: z.array(CommentSchema),
    config: AppSettingsSchema.optional()
});

export const SaveProjectRequestSchema = z.object({
    email: z.string(),
    project: z.object({
        id: z.string(),
        name: z.string(),
        configStr: z.string().optional(),
        author: z.string(),
        url: z.string(),
        role: z.string().optional()
    })
});

export const VerifyAccessRequestSchema = z.object({
    token: z.string(),
    roomId: z.string()
});

export const VerifyAccessResponseSchema = z.object({
    allowed: z.boolean(),
    role: z.string().optional(),
    code: z.string().optional(),
    error: z.string().optional()
});
