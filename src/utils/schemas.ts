import { z } from 'zod';

// --- Base Enums ---

export enum UserRoleType {
    HOST = 'host',
    OWNER = 'owner',
    ADMIN = 'admin',
    EDITOR = 'editor',
    RW = 'rw',
    VIEWER = 'viewer',
    R = 'r',
    GUEST = 'guest'
}

export const UserRoleTypeSchema = z.nativeEnum(UserRoleType);

export const LanguageSchema = z.enum(['en', 'ua', 'cz', 'fr', 'bg', 'de', 'es']);

// --- Base Domain Objects ---

export const NodePropertySchema = z.object({
    name: z.string(),
    type: z.string(),
    color: z.string()
});

export const NodeDataSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    color: z.string(),
    x: z.number(),
    y: z.number(),
    props: z.array(NodePropertySchema).optional(),
    docLink: z.string().optional(),
    locked: z.boolean().optional(),
    fx: z.number().nullable().optional(),
    fy: z.number().nullable().optional(),
    createdAt: z.string()
});

export const EdgeDataSchema = z.object({
    id: z.string(),
    source: z.string(), 
    target: z.string(), 
    label: z.string().optional(),
    sourceProp: z.string().optional(),
    targetProp: z.string().optional(),
    color: z.string().optional(),
    strokeColor: z.string().optional(),
    strokeWidth: z.number().optional(),
    strokeType: z.enum(['solid', 'dashed', 'dotted']).optional(),
    relationType: z.enum(['1:1', '1:n']).optional(),
    labelRotation: z.number().optional(),
});

export const CommentReplySchema = z.object({
    id: z.string(),
    content: z.string(),
    author: z.object({
        name: z.string(),
        color: z.string(),
    }),
    createdAt: z.number()
});

export const CommentSchema = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    content: z.string(),
    author: z.object({
        name: z.string(),
        color: z.string(),
    }),
    targetId: z.string().optional(),
    targetType: z.enum(['node', 'edge', 'canvas']).optional(),
    isResolved: z.boolean().optional(),
    replies: z.array(CommentReplySchema).optional(),
    createdAt: z.number()
});

export const ProjectConfigSchema = z.object({
    canvasBg: z.string().optional(),
});

export const UserProfileSchema = z.object({
    name: z.string(),
    color: z.string(),
    lastUpdated: z.number().optional(),
    // Cached Preferences
    language: z.string().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    componentBg: z.string().optional(),
    propertyText: z.string().optional(),
    canvasBg: z.string().optional(),
});

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    role: z.string().optional(),
    lastActive: z.number(),
    visible: z.boolean().optional(),
    // Preferences
    language: z.string().default('en'),
    theme: z.enum(['light', 'dark']).default('light'),
    componentBg: z.string().default('#6366F1'),
    propertyText: z.string().default('#000000'),
    canvasBg: z.string().optional(),
});

export const ActiveSessionUserSchema = z.object({
    socketId: z.string(),
    userId: z.string().optional(),
    id: z.string().optional(),
    name: z.string(),
    color: z.string(),
    role: z.string(),
    isVisible: z.boolean(),
    isMe: z.boolean().optional(),
    roleBadge: z.string().optional(),
});

export const RoomAccessUserSchema = z.object({
    userId: z.string().optional(),
    email: z.string().optional(),
    name: z.string(),
    role: z.string(),
    accessId: z.string().optional(),
});

export const SavedProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    author: z.string(),
    url: z.string(),
    configStr: z.string(),
    lastAccessed: z.number(),
    role: z.string().optional(),
});

export const TranslationSchema = z.record(z.string(), z.string());

// --- History ---

export const HistoryItemSchema = z.object({
     id: z.string(),
     timestamp: z.number(),
     actionType: z.string(),
     // We can make this strictly typed later if needed, but for now object is safer than any
     data: z.record(z.string(), z.unknown()).optional(), 
     author: z.string()
});
