const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        public message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

class ApiClient {
    private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error: unknown) {
            clearTimeout(id);
            if (error instanceof Error && error.name === 'AbortError') {
                 throw new ApiError(408, 'NETWORK_ERROR', 'Request timed out (Backend Unreachable)');
            }
            throw new ApiError(0, 'NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown Network Error');
        }
    }

    private getHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    private async handleResponse(res: Response) {
        if (!res.ok) {
            let errorData;
            try {
                errorData = await res.json();
            } catch (e) {
                // Return text if JSON parse fails
                throw new ApiError(res.status, 'INTERNAL_ERROR', await res.text());
            }

            // Backend returns: { status: 'error', statusCode, code, message }
            if (errorData && errorData.code) {
                throw new ApiError(res.status, errorData.code, errorData.message);
            }
            
            throw new ApiError(res.status, 'INTERNAL_ERROR', errorData.message || 'Unknown Error');
        }
        return res.json();
    }

    async get<T>(path: string): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        return this.handleResponse(res);
    }

    async put<T>(path: string, body: unknown): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
    
    async delete<T>(path: string): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
}

export const apiClient = new ApiClient();
