export interface NodeProperty {
  name: string;
    type: string;
    color: string
}

export interface NodeData {
  id: string;
  title: string;
  description?: string;
  color: string;
  x: number;
  y: number;
  props?: NodeProperty[];
  docLink?: string;
  locked?: boolean;
  fx?: number | null;
  fy?: number | null;
  createdAt: string;
  
}

export interface EdgeData {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  label?: string;
  sourceProp?: string;
  targetProp?: string;
  color?: string;
  strokeColor?: string; // Add this for consistency
  strokeWidth?: number;
  strokeType?: 'solid' | 'dashed' | 'dotted';
  relationType?: '1:1' | '1:n';
  labelRotation?: number; 
}

export interface Comment {
    id: string;
    x: number;
    y: number;
    content: string;
    author: {
        name: string;
        color: string;
    };
    targetId?: string; // Node ID or Edge ID
    targetType?: 'node' | 'edge' | 'canvas';
    isResolved?: boolean;
    replies?: CommentReply[];
    createdAt: number;
}

export interface CommentReply {
    id: string;
    content: string;
    author: {
        name: string;
        color: string;
    };
    createdAt: number;
}

export interface User {
  id: string; // email or uid
  name: string;
  color: string;
  role?: 'host' | 'guest' | 'admin';
  lastActive: number;
  visible?: boolean;
}

export interface SavedProject {
  id: string;
  name: string;
  author: string;
  url: string;
  configStr: string;
  lastAccessed: number;
  role?: 'host' | 'guest' | 'admin';
}

export interface AppSettings {
  language: string;
  theme: 'light' | 'dark';
  backgroundColor?: string;
  userProfile: {
    name: string;
    color: string;
    lastUpdated?: number; // Timestamp for sync
  };
  defaultColors: {
    componentBg: string;
    propertyText: string;
    canvasBg?: string;
  };
}

export interface Translation {
  [key: string]: string;
}

export type Language = 'en' | 'ua' | 'cz' | 'fr' | 'bg' | 'de' | 'es';
