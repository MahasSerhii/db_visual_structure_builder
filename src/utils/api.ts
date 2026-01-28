const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
             throw new Error('Request timed out (Backend Unreachable)');
        }
        throw error;
    }
};

export const api = {
    async get(path: string) {
        const token = localStorage.getItem('auth_token');
        const res = await fetchWithTimeout(`${API_BASE}${path}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async post(path: string, body: any) {
        const token = localStorage.getItem('auth_token');
        const res = await fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    async put(path: string, body: any) {
        const token = localStorage.getItem('auth_token');
        const res = await fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    
    async delete(path: string) {
         const token = localStorage.getItem('auth_token');
        const res = await fetchWithTimeout(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};

export const uploadFullGraphToBackend = async (projectId: string, nodes: any[], edges: any[], comments: any[], replace: boolean = false, config?: any) => {
    return api.post(`/graph/${projectId}/sync?replace=${replace}`, { nodes, edges, comments, config });
};
