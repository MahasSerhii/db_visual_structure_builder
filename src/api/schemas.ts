import { z } from 'zod';
import { ProjectConfigSchema, NodeDataSchema, EdgeDataSchema, CommentSchema } from '../utils/schemas';

// --- Auth Schemas ---

export const AuthUserSchema = z.object({
    _id: z.string(),
    id: z.string().optional(), // Allow id alias
    name: z.string(),
    email: z.string(),
    color: z.string().optional(),
    avatar: z.string().optional(),
    lastActive: z.number().optional(),
    profileUpdatedAt: z.number().optional(),
    // Preferences
    language: z.string().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    componentBg: z.string().optional(),
    propertyText: z.string().optional(),
    canvasBg: z.string().optional(),
});

export const AuthResponseSchema = z.object({
    token: z.string(),
    user: AuthUserSchema,
    projects: z.array(z.record(z.string(), z.unknown())).optional() 
});

export const UserResponseSchema = z.object({
    user: AuthUserSchema,
    projects: z.array(z.record(z.string(), z.unknown())).optional() 
});

export const UpdateProfileRequestSchema = z.object({
    name: z.string().optional(),
    color: z.string().optional(),
    profileUpdatedAt: z.number().optional(),
    language: z.string().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    componentBg: z.string().optional(),
    propertyText: z.string().optional(),
    canvasBg: z.string().optional(),
});

// --- Graph Schemas ---

export const GraphProjectSchema = z.object({
    _id: z.string(),
    name: z.string(),
    ownerId: z.string(),
    isPublic: z.boolean(),
    config: ProjectConfigSchema.optional()
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
    config: ProjectConfigSchema.optional()
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
