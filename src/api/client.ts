const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
                 throw new Error('Request timed out (Backend Unreachable)');
            }
            throw error;
        }
    }

    private getHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    async get<T>(path: string): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await this.fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
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
