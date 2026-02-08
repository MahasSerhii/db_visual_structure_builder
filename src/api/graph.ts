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
    getGraph: (projectId: string) => {
        return apiClient.get<GraphDataResponse>(`/graph/${projectId}`);
    },

    initGraph: (data: { name?: string, isPublic?: boolean, config?: ProjectConfig }) => {
        return apiClient.post<{ success: boolean, project: { _id: string, name: string } }>('/graph/init', data);
    },

    deleteGraph: (projectId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}`);
    },

    syncGraph: (projectId: string, data: SyncGraphRequest, replace: boolean = false) => {
        return apiClient.post<ApiResponse>(`/graph/${projectId}/sync?replace=${replace}`, data);
    },

    clearRoom: (projectId: string) => {
        return apiClient.post<ApiResponse>('/graph/clear-room', { projectId });
    },

    getAccess: (projectId: string) => {
        return apiClient.get<{ users: RoomAccessUser[] }>(`/graph/${projectId}/access`);
    },

    removeAccess: (projectId: string, accessId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}/access/${accessId}`);
    },

    // Legacy/Other endpoints inferred from usage
    saveProject: (data: SaveProjectRequest) => {
        return apiClient.post<ApiResponse>('/save-project', data);
    },

    inviteUser: (data: { email: string, projectId: string, role: string, invitedBy: string }) => {
        return apiClient.post<ApiResponse>('/auth/invite', data);
    },

    verifyAccess: (data: VerifyAccessRequest) => {
        return apiClient.post<VerifyAccessResponse>('/auth/verify-access', data);
    },


    addNode: (projectId: string, node: NodeData) => {
        return apiClient.post<ApiResponse>(`/graph/${projectId}/node`, { ...node, id: node.id });
    },

    updateNode: (projectId: string, node: NodeData) => {
        return apiClient.put<ApiResponse>(`/graph/${projectId}/node/${node.id}`, { ...node, id: node.id });
    },

    deleteNode: (projectId: string, nodeId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}/node/${nodeId}`);
    },

    addEdge: (projectId: string, edge: EdgeData) => {
        return apiClient.post<ApiResponse>(`/graph/${projectId}/edge`, { ...edge, id: edge.id });
    },

    updateEdge: (projectId: string, edge: EdgeData) => {
        return apiClient.put<ApiResponse>(`/graph/${projectId}/edge/${edge.id}`, { ...edge, id: edge.id });
    },

    deleteEdge: (projectId: string, edgeId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}/edge/${edgeId}`);
    },

    addComment: (projectId: string, comment: Comment) => {
        return apiClient.post<ApiResponse>(`/graph/${projectId}/comment`, { ...comment, id: comment.id });
    },

    updateComment: (projectId: string, comment: Comment) => {
        return apiClient.put<ApiResponse>(`/graph/${projectId}/comment/${comment.id}`, { ...comment, id: comment.id });
    },

    deleteComment: (projectId: string, commentId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}/comment/${commentId}`);
    },

    updateConfig: (projectId: string, config: ProjectConfig) => {
        return apiClient.put<ApiResponse>(`/graph/${projectId}/config`, { config });
    },

    updateBackground: (projectId: string, color: string) => {
        return apiClient.put<ApiResponse>(`/graph/${projectId}/background`, { color });
    },

    clearHistory: (projectId: string) => {
        return apiClient.delete<ApiResponse>(`/graph/${projectId}/history`);
    },

    revertHistory: (projectId: string, historyId: string) => {
        return apiClient.post<ApiResponse>(`/graph/${projectId}/history/${historyId}/revert`, {});
    }
};
