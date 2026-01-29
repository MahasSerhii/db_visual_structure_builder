import { apiClient } from './client';
import { UpdateProfileRequest, UserResponse } from './apiTypes';

export const authApi = {
    getUser: () => {
        return apiClient.get<UserResponse>('/auth/user');
    },

    updateProfile: (data: UpdateProfileRequest) => {
        return apiClient.put<void>('/auth/profile', data);
    }
    
    // Login usually happens via Google/Apple redirect or specific endpoint not generic to this flow? 
    // Usually login generates token.
};
