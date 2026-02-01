import { apiClient } from './client';
import { 
    GraphDataResponse, 
    SyncGraphRequest, 
    ApiResponse, 
    SaveProjectRequest, 
    VerifyAccessRequest, 
    VerifyAccessResponse 
} from './apiTypes';
import { NodeData, EdgeData, Comment, RoomAccessUser, ProjectConfig } from '../utils/types';

export const graphApi = {
    getGraph: (roomId: string) => {
        return apiClient.get<GraphDataResponse>(`/graph/${roomId}`);
    },

    initGraph: (data: { roomId: string, name?: string, isPublic?: boolean, config?: ProjectConfig }) => {
        return apiClient.post<ApiResponse>('/graph/init', data);
    },

    deleteGraph: (roomId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}`);
    },

    syncGraph: (roomId: string, data: SyncGraphRequest, replace: boolean = false) => {
        return apiClient.post<ApiResponse>(`/graph/${roomId}/sync?replace=${replace}`, data);
    },

    clearRoom: (roomId: string) => {
        return apiClient.post<ApiResponse>('/graph/clear-room', { roomId });
    },

    getAccess: (roomId: string) => {
        return apiClient.get<{ users: RoomAccessUser[] }>(`/graph/${roomId}/access`);
    },

    removeAccess: (roomId: string, accessId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}/access/${accessId}`);
    },

    // Legacy/Other endpoints inferred from usage
    saveProject: (data: SaveProjectRequest) => {
        return apiClient.post<ApiResponse>('/save-project', data);
    },

    inviteUser: (data: { email: string, roomId: string, role: string, invitedBy: string }) => {
        return apiClient.post<ApiResponse>('/auth/invite', data);
    },

    verifyAccess: (data: VerifyAccessRequest) => {
        return apiClient.post<VerifyAccessResponse>('/auth/verify-access', data);
    },


    addNode: (roomId: string, node: NodeData) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/node`, { ...node, id: node.id });
    },

    updateNode: (roomId: string, node: NodeData) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/node`, { ...node, id: node.id });
    },

    deleteNode: (roomId: string, nodeId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}/node/${nodeId}`);
    },

    addEdge: (roomId: string, edge: EdgeData) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/edge`, { ...edge, id: edge.id });
    },

    updateEdge: (roomId: string, edge: EdgeData) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/edge`, { ...edge, id: edge.id });
    },

    deleteEdge: (roomId: string, edgeId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}/edge/${edgeId}`);
    },

    addComment: (roomId: string, comment: Comment) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/comment`, { ...comment, id: comment.id });
    },

    updateComment: (roomId: string, comment: Comment) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/comment`, { ...comment, id: comment.id });
    },

    deleteComment: (roomId: string, commentId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}/comment/${commentId}`);
    },

    updateConfig: (roomId: string, config: ProjectConfig) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/config`, { config });
    },

    updateBackground: (roomId: string, color: string) => {
        return apiClient.put<ApiResponse>(`/graph/${roomId}/background`, { color });
    },

    clearHistory: (roomId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${roomId}/history`);
    },

    revertHistory: (roomId: string, historyId: string) => {
        return apiClient.post<ApiResponse>(`/graph/${roomId}/history/${historyId}/revert`, {});
    }
};
