import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NodeData, EdgeData, User, AppSettings, Comment } from '../utils/types';
import { dbOp, initDB } from '../utils/indexedDB';
import { getTranslation } from '../utils/translations';
import { syncNodeChange, syncEdgeChange, syncCommentChange, deleteRemoteNode, deleteRemoteEdge, deleteRemoteComment } from '../utils/firebase';

interface GraphContextType {
    nodes: NodeData[];
    edges: EdgeData[];
    comments: Comment[];
    config: AppSettings;
    isLoading: boolean;
    setNodes: (nodes: NodeData[]) => void;
    setEdges: (edges: EdgeData[]) => void;
    addNode: (node: NodeData) => Promise<void>;
    updateNode: (node: NodeData) => Promise<void>;
    deleteNode: (id: string) => Promise<void>;
    addEdge: (edge: EdgeData) => Promise<void>;
    updateEdge: (edge: EdgeData) => Promise<void>;
    deleteEdge: (id: string) => Promise<void>;
    addComment: (comment: Comment) => void;
    updateComment: (comment: Comment) => void;
    deleteComment: (id: string) => void;
    refreshData: (isCoolUpdate?: boolean) => Promise<void>;
    currentRoomId: string | null;
    setCurrentRoomId: (id: string | null) => void;
    updateConfig: (newConfig: AppSettings) => void;
    isLiveMode: boolean;
    setLiveMode: (isLive: boolean) => void;
    setGraphData: (nodes: NodeData[], edges: EdgeData[], comments?: Comment[]) => void;
    activeCommentId: string | null;
    setActiveCommentId: (id: string | null) => void;
    history: HistoryItem[];
    addToHistory: (action: string, details: string) => void;
    t: (key: string) => string;
}

export interface HistoryItem {
    id: string;
    action: string;
    details: string;
    timestamp: number;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider = ({ children }: { children: ReactNode }) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiveMode, setLiveMode] = useState(false);
    // We keep local data in a ref or separate state to switch back
    const [localCache, setLocalCache] = useState<{nodes: NodeData[], edges: EdgeData[]} | null>(null);

    const [config, setConfig] = useState<AppSettings>({
        language: 'en',
        theme: 'light',
        userProfile: { name: '', color: '#6366F1' },
        defaultColors: { componentBg: '#6366F1', propertyText: '#000000' }
    });
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

    // Global Active Comment State (for Thread Modal that can differ from List Modal)
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

    // Sync Theme
    useEffect(() => {
        if (config.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [config.theme]);

    useEffect(() => {
        const loadData = async () => {
            try {
                await initDB();
                const loadedNodes = await dbOp('nodes', 'readonly', 'getAll') as NodeData[];
                const loadedEdges = await dbOp('edges', 'readonly', 'getAll') as EdgeData[];
                const loadedComments = await dbOp('comments', 'readonly', 'getAll') as Comment[];
                setNodes(loadedNodes);
                setEdges(loadedEdges);
                setComments(loadedComments);
                
                // Load config from LocalStorage
                const savedConfig = localStorage.getItem('app_config');
                if (savedConfig) {
                    try {
                        const parsed = JSON.parse(savedConfig);
                        // Merge with default to ensure new fields exist
                        setConfig(prev => ({ ...prev, ...parsed }));
                    } catch(e) { console.error("Config Parse Error", e); }
                }
            } catch (e) {
                console.error("Failed to init data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const refreshData = async (isCoolUpdate = false) => {
        if(isLiveMode) return; // Don't overwrite live data with local DB

        if (!isCoolUpdate) setIsLoading(true);
        const [n, e, c] = await Promise.all([
            dbOp('nodes', 'readonly', 'getAll') as Promise<NodeData[]>,
            dbOp('edges', 'readonly', 'getAll') as Promise<EdgeData[]>,
            dbOp('comments', 'readonly', 'getAll') as Promise<Comment[]>
        ]);
        setNodes(n);
        setEdges(e);
        setComments(c);
        if (!isCoolUpdate) setIsLoading(false);
    };

    // Toggle Mode Logic
    useEffect(() => {
        if (isLiveMode) {
             // Save local state before switching to live? 
             // Ideally we should have done this *before* setLiveMode(true).
             // But here we can't easily access the pre-update state.
             // Instead, rely on consumer to cache local data before enabling live mode.
        } else {
            // Switching back to local: refresh from DB
            refreshData();
        }
    }, [isLiveMode]);
    
    // Direct Set for Live Data
    const setGraphData = (newNodes: NodeData[], newEdges: EdgeData[], newComments?: Comment[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        if (newComments) setComments(newComments);
    };

    const addComment = async (comment: Comment) => {
        setComments(prev => [...prev, comment]);
        if (isLiveMode) {
            syncCommentChange(comment);
        } else {
            await dbOp('comments', 'readwrite', 'put', comment);
        }
    };

    const updateComment = async (comment: Comment) => {
        setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
        if (isLiveMode) {
            syncCommentChange(comment);
        } else {
            await dbOp('comments', 'readwrite', 'put', comment);
        }
    };

    const deleteComment = async (id: string) => {
        setComments(prev => prev.filter(c => c.id !== id));
        if (isLiveMode) {
            deleteRemoteComment(id);
        } else {
            await dbOp('comments', 'readwrite', 'delete', id);
        }
    };

    const addToHistory = (action: string, details: string) => {
        const newItem: HistoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            action,
            details,
            timestamp: Date.now()
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50
    };

    const addNode = async (node: NodeData) => {
        // Optimistic
        setNodes(prev => [...prev, node]);
        
        if (isLiveMode) {
            syncNodeChange(node);
        } else {
            await dbOp('nodes', 'readwrite', 'put', node);
            addToHistory('Add Node', `Created node: ${node.title || node.id}`);
        }
    };

    const updateNode = async (node: NodeData) => {
        // Optimistic
        setNodes(prev => prev.map(n => n.id === node.id ? node : n));

        if (isLiveMode) {
            syncNodeChange(node);
        } else {
            await dbOp('nodes', 'readwrite', 'put', node);
            addToHistory('Update Node', `Updated node: ${node.title || node.id}`);
        }
    };

    const deleteNode = async (id: string) => {
        // Optimistic
        setNodes(prev => prev.filter(n => n.id !== id));
        setEdges(prev => prev.filter(e => {
             const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
             const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
             return s !== id && t !== id;
        }));

        if (isLiveMode) {
            deleteRemoteNode(id);
            // Also delete connected edges remotely? 
            // Ideally we should find them and delete them too.
            const edgesToDelete = edges.filter(e => {
                 const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
                 const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
                 return s === id || t === id;
            });
            edgesToDelete.forEach(e => deleteRemoteEdge(e.id));
        } else {
            await dbOp('nodes', 'readwrite', 'delete', id);
            const allEdges = await dbOp('edges', 'readonly', 'getAll') as EdgeData[];
            const toDelete = allEdges.filter(e => e.source === id || e.target === id);
            for(const e of toDelete) await dbOp('edges', 'readwrite', 'delete', e.id);
            addToHistory('Delete Node', `Deleted node: ${id}`);
        }
    };


    const addEdge = async (edge: EdgeData) => {
        if (isLiveMode) {
            // Optimistic update for edges is tricky because they might depend on nodes existing?
            // Actually it's fine.
            syncEdgeChange(edge);
            // We can also optimistic update local state to feel faster
            setEdges(prev => [...prev, edge]);
        } else {
            await dbOp('edges', 'readwrite', 'put', edge);
            addToHistory('Add Edge', `Connected nodes`);
            await refreshData(true);
        }
    };

    const updateEdge = async (edge: EdgeData) => {
        if (isLiveMode) {
             syncEdgeChange(edge);
             setEdges(prev => prev.map(e => e.id === edge.id ? edge : e));
        } else {
            await dbOp('edges', 'readwrite', 'put', edge);
            addToHistory('Update Edge', `Updated connection`);
            await refreshData(true);
        }
    };

    const deleteEdge = async (id: string) => {
        if (isLiveMode) {
            deleteRemoteEdge(id);
            setEdges(prev => prev.filter(e => e.id !== id));
        } else {
            await dbOp('edges', 'readwrite', 'delete', id);
            addToHistory('Delete Edge', `Removed connection`);
            await refreshData(true);
        }
    };

    const updateConfig = (newConfig: AppSettings) => {
        setConfig(newConfig);
        localStorage.setItem('app_config', JSON.stringify(newConfig));
    };

    const t = (key: string) => getTranslation(config.language as any || 'en', key);

    return (
        <GraphContext.Provider value={{
            nodes, edges, comments, config, isLoading,
            setNodes, setEdges,
            addNode, updateNode, deleteNode,
            addEdge, updateEdge, deleteEdge,
            addComment, updateComment, deleteComment,
            refreshData,
            currentRoomId, setCurrentRoomId,
            activeCommentId, setActiveCommentId,
            updateConfig,
            isLiveMode, setLiveMode, setGraphData,
            history, addToHistory,
            t
        }}>
            {children}
        </GraphContext.Provider>
    );
};

export const useGraph = () => {
    const context = useContext(GraphContext);
    if (context === undefined) {
        throw new Error('useGraph must be used within a GraphProvider');
    }
    return context;
};
