import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { NodeData, EdgeData, User, AppSettings, Comment } from '../utils/types';
import { dbOp, initDB, deleteWholeDB } from '../utils/indexedDB';
import { getTranslation } from '../utils/translations';
import { api, uploadFullGraphToBackend } from '../utils/api';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'failed'; 

interface GraphContextType {
    nodes: NodeData[];
    edges: EdgeData[];
    comments: Comment[];
    config: AppSettings;
    isLoading: boolean;
    connectionStatus: ConnectionStatus;
    retryConnection: () => Promise<void>;
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
    updateProjectBackground: (color: string) => Promise<void>;
    isLiveMode: boolean;
    setLiveMode: (isLive: boolean) => void;
    // New state to show global loader while performing pre-flight checks
    isTransitioningToLive: boolean; 
    setTransitioningToLive: (val: boolean) => void;
    setGraphData: (nodes: NodeData[], edges: EdgeData[], comments?: Comment[]) => void;
    activeCommentId: string | null;
    setActiveCommentId: (id: string | null) => void;
    history: HistoryItem[];
    addToHistory: (action: string, details: string, snapshot?: GraphSnapshot) => void;
    restoreSnapshot: (snapshot: GraphSnapshot) => void;
    isReadOnly: boolean;
    setReadOnly: (readonly: boolean) => void;
    t: (key: string) => string;
    isAuthenticated: boolean;
    activeUsers: any[];
    isUserVisible: boolean;
    toggleUserVisibility: () => void;
    authProvider: 'email' | 'google' | 'apple';
    savedProjects: any[];
    login: (token: string, email: string, name?: string, provider?: 'email' | 'google' | 'apple', projects?: any[], userProfile?: any) => void;
    logout: () => Promise<void>;
    clearHistory: () => Promise<void>;
}

export interface GraphSnapshot {
    nodes: NodeData[];
    edges: EdgeData[];
    comments: Comment[];
}

export interface HistoryItem {
    id: string;
    action: string;
    details: string;
    author: string; // Added Author
    isRevertAction?: boolean; // Track if this was a revert
    timestamp: number;
    snapshot?: GraphSnapshot;
    canRevert?: boolean;
    entityType?: string;
    entityId?: string;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const GraphProvider = ({ children }: { children: ReactNode }) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
    
    // Persistence: Initialize from LocalStorage
    const [currentRoomId, _setCurrentRoomId] = useState<string | null>(() => {
        return localStorage.getItem('current_room_id');
    });
    const [isLiveMode, _setLiveMode] = useState(() => {
        return localStorage.getItem('is_live_mode') === 'true';
    });
    const [isTransitioningToLive, setTransitioningToLive] = useState(false);

    const setCurrentRoomId = (id: string | null) => {
        _setCurrentRoomId(id);
        if (id) localStorage.setItem('current_room_id', id);
        else localStorage.removeItem('current_room_id');
    };

    const setLiveMode = (isLive: boolean) => {
        _setLiveMode(isLive);
        localStorage.setItem('is_live_mode', String(isLive));
        if (!isLive) {
            setConnectionStatus('connected'); // Reset failed/connecting status when switching to local
        } else {
             // Trigger connect logic implicitly by letting effects run 
             // but we might want to set status to connecting to show loader immediately
             if (connectionStatus === 'failed') setConnectionStatus('connecting'); // Reset failed if retrying live
        }
    };

    // New ReadOnly Access State
    const [isReadOnly, setReadOnly] = useState(false);

    // We keep local data in a ref or separate state to switch back
    const [localCache, setLocalCache] = useState<{nodes: NodeData[], edges: EdgeData[]} | null>(null);

    const [config, setConfig] = useState<AppSettings>({
        language: 'en',
        theme: 'light',
        backgroundColor: '#f8fafc',
        userProfile: { name: '', color: '#6366F1', lastUpdated: Date.now() },
        defaultColors: { componentBg: '#6366F1', propertyText: '#000000' }
    });
    
    // Visibility
    const [isUserVisible, setIsUserVisible] = useState(() => {
        return localStorage.getItem('is_user_visible') !== 'false'; // Default to true
    });
    const toggleUserVisibility = () => {
        setIsUserVisible(prev => {
            const next = !prev;
            localStorage.setItem('is_user_visible', String(next));
            if (socketRef.current && currentRoomId) {
                socketRef.current.emit('user:visibility', { roomId: currentRoomId, isVisible: next });
            }
            return next;
        });
    };

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('auth_token'));
    const [savedProjects, setSavedProjects] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('saved_projects');
            return saved ? JSON.parse(saved) : [];
        } catch(e) { return []; }
    });
    const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'apple'>(() => 
        (localStorage.getItem('auth_provider') as any) || 'email'
    );

    // Socket.IO Setup
    const socketRef = useRef<Socket | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace('/api', '');
        const socket = io(socketUrl); 
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("Socket Connected");
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        const handleJoinRoom = () => {
             if (currentRoomId && isAuthenticated) {
                 // Ensure we don't send empty/default profiles if we have them stored but not loaded in state yet?
                 // Actually relying on 'config' state is best, as it updates when storage loads.
                 const sessionUserName = config.userProfile.name || localStorage.getItem('my_user_name') || 'Anonymous';
                 const sessionUserId = localStorage.getItem('my_user_id'); // Stabilize identity
                 
                 socket.emit('join-room', {
                     roomId: currentRoomId,
                     userId: sessionUserId, // Use stable ID for deduplication
                     userName: sessionUserName,
                     userColor: config.userProfile.color,
                     userEmail: (authProvider === 'email' ? 'hidden' : undefined),
                     isVisible: isUserVisible
                 });
             }
        };

        if (currentRoomId && isAuthenticated) {
             handleJoinRoom();

             // Re-join logic on connection restore
             socket.on('connect', handleJoinRoom);
             
             socket.on('presence:update', (users: any[]) => {
                 setActiveUsers(users);
             });
             
             const handleNodeUpdate = (n: any) => {
                 setNodes(prev => {
                     // Check if update is newer? relying on server broadcoaster to be truth.
                     // Avoid loop if we just updated locally? 
                     // Usually optimistic update sets it, receiving same data is fine.
                     const idx = prev.findIndex(p => p.id === n.id);
                     if (idx >= 0) {
                         // Shallow check to avoid rerender?
                         if (JSON.stringify(prev[idx]) === JSON.stringify(n)) return prev;
                         const copy = [...prev];
                         copy[idx] = { ...copy[idx], ...n };
                         return copy;
                     }
                     return [...prev, n];
                 });
             };
             
             const handleNodeDelete = ({ id }: { id: string }) => {
                 setNodes(prev => prev.filter(n => n.id !== id));
                 setEdges(prev => prev.filter(e => {
                     const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
                     const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
                     return s !== id && t !== id;
                 }));
             };

             const handleEdgeUpdate = (e: any) => {
                 setEdges(prev => {
                     const idx = prev.findIndex(item => item.id === e.id);
                     if (idx >= 0) {
                         const copy = [...prev];
                         copy[idx] = { ...copy[idx], ...e };
                         return copy;
                     }
                     return [...prev, e];
                 });
             };

             const handleEdgeDelete = ({ id }: { id: string }) => {
                  setEdges(prev => prev.filter(e => e.id !== id));
             };
             
             const handleCommentUpdate = (c: any) => {
                 setComments(prev => {
                     const idx = prev.findIndex(item => item.id === c.id);
                     if (idx >= 0) {
                         const copy = [...prev];
                         copy[idx] = { ...copy[idx], ...c };
                         return copy;
                     }
                     return [...prev, c];
                 });
             };
             
             const handleCommentDelete = ({ id }: { id: string }) => {
                 setComments(prev => prev.filter(c => c.id !== id));
             };

             const handleHistoryAdd = (item: HistoryItem) => {
                 setHistory(prev => [item, ...prev].slice(0, 50)); 
             };

             const handleHistoryClear = () => {
                 setHistory([]);
             };

             socket.on('node:update', handleNodeUpdate);
             socket.on('node:delete', handleNodeDelete);
             socket.on('edge:update', handleEdgeUpdate);
             socket.on('edge:delete', handleEdgeDelete);
             socket.on('comment:update', handleCommentUpdate);
             socket.on('comment:delete', handleCommentDelete);
             socket.on('history:add', handleHistoryAdd);
             socket.on('history:clear', handleHistoryClear);
             
             socket.on('project:settings', (data: any) => {
                 if (data.backgroundColor) {
                     setConfig(prev => ({ ...prev, backgroundColor: data.backgroundColor }));
                 }
             });

             // If the socket was already connected before this component mounted (e.g. from previous view)
             // we need to make sure we joined.
             if (socket.connected) {
                  handleJoinRoom();
             }

             return () => {
                 socket.off('connect', handleJoinRoom);
                 socket.emit('leave-room', currentRoomId);
                 socket.off('node:update', handleNodeUpdate);
                 socket.off('node:delete', handleNodeDelete);
                 socket.off('project:settings');
                 socket.off('edge:update', handleEdgeUpdate);
                 socket.off('edge:delete', handleEdgeDelete);
                 socket.off('comment:update', handleCommentUpdate);
                 socket.off('comment:delete', handleCommentDelete);
                 socket.off('history:add', handleHistoryAdd);
                 socket.off('history:clear', handleHistoryClear);
                 socket.off('presence:update');
             };
        }
    }, [currentRoomId, isAuthenticated, config.userProfile.name, config.userProfile.color, isUserVisible]); // Re-join if profile changes

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // setIsAuthenticated(true); // Already set by initializer
            try {
                // Decode email from token if possible, or store in LS
                const payload = JSON.parse(atob(token.split('.')[1]));
                // ...
            } catch(e) {}
        }
    }, []);

    const login = (token: string, email: string, name?: string, provider: 'email' | 'google' | 'apple' = 'email', projects: any[] = [], userProfile?: any) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_provider', provider);
        localStorage.setItem('saved_projects', JSON.stringify(projects));
        setIsAuthenticated(true);
        setAuthProvider(provider);
        setSavedProjects(projects);

        // Sync Logic: Compare Local vs Server Timestamp
        const serverTime = userProfile?.profileUpdatedAt ? new Date(userProfile.profileUpdatedAt).getTime() : 0;
        const localTime = config.userProfile.lastUpdated || 0;
        
        // If Server is newer -> Use Server Profile
        if (serverTime > localTime && userProfile) {
            console.log("Syncing Profile from Server");
            const merged = { ...config.userProfile };
            if (userProfile.name) merged.name = userProfile.name;
            if (userProfile.color) merged.color = userProfile.color;
            merged.lastUpdated = serverTime;

            const newConfig = { ...config, userProfile: merged };
            setConfig(newConfig);
            localStorage.setItem('app_config', JSON.stringify(newConfig));
            localStorage.setItem('my_user_name', merged.name); // Legacy sync
        } else {
             // Local is newer -> Push to Server
             if (localTime > serverTime) {
                 const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '') + '/api/auth/profile';
                 fetch(socketUrl, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        visible: true, 
                        name: config.userProfile.name, 
                        color: config.userProfile.color, 
                        profileUpdatedAt: localTime 
                    })
                 }).catch(e => console.warn("Auto-sync profile failed", e));
             }

             // Base logic:
             let finalName = config.userProfile.name;
             // If local name is empty/default, adopt login name
             if (!finalName || finalName === 'User' || finalName === '') {
                 finalName = name || email.split('@')[0];
             }
             
             setConfig(prev => {
                const updated = { 
                    ...prev, 
                    userProfile: { 
                        ...prev.userProfile, 
                        name: finalName,
                        // If we are strictly keeping local, do we update timestamp? 
                        // Maybe not, unless we actually changed something.
                    }
                };
                localStorage.setItem('app_config', JSON.stringify(updated));
                return updated;
             });
             localStorage.setItem('my_user_name', finalName);
        }
    };

    const logout = async () => {
        // 1. Clear IndexedDB (Best Effort)
        try {
            await deleteWholeDB();
        } catch (e) {
            console.error("Failed to delete DB on logout", e);
        }

        // 2. Clear Local & Session Storage - FORCE EVERYTHING
        localStorage.clear(); 
        sessionStorage.clear();
        
        // Double check specific sensitive keys to be absolutely sure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('app_config');
        localStorage.removeItem('current_room_id');
        localStorage.removeItem('my_user_id');

        // 3. Reset State
        setIsAuthenticated(false);
        setSavedProjects([]);
        setNodes([]);
        setEdges([]);
        setComments([]);
        
        // 4. Force Reload to ensure clean slate
        window.location.reload();
    };

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

                // Add Initial History State
                setHistory([{
                    id: 'init',
                    action: 'Initial Load',
                    details: 'Loaded from local storage',
                    author: 'System',
                    timestamp: Date.now(),
                    snapshot: { nodes: loadedNodes, edges: loadedEdges, comments: loadedComments }
                }]);
            } catch (e) {
                console.error("Failed to init data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const refreshData = async (shouldForce = false) => {
        if (connectionStatus === 'failed' && !shouldForce) return;

        // CRITICAL FIX: Only fetch from Backend if we are strictly in Live Mode.
        // If we are in Local Mode (even with a RoomID set), we must use LocalDB.
        if (currentRoomId && isAuthenticated && isLiveMode) {
           setIsLoading(true);
           setConnectionStatus('connecting'); 
           
           let attempts = 0;
           const maxAttempts = 3;

           while (attempts < maxAttempts) {
               try {
                    const data = await api.get(`/graph/${currentRoomId}`);
                    // Transform backend nodeId -> id
                    const mappedNodes = data.nodes.map((n: any) => ({ ...n, id: n.nodeId }));
                    const mappedEdges = data.edges.map((e: any) => ({ ...e, id: e.edgeId }));
                    const mappedComments = data.comments.map((c: any) => ({ ...c, id: c.commentId }));

                    setNodes(mappedNodes);
                    setEdges(mappedEdges);
                    setComments(mappedComments);
                    
                    if (data.project && data.project.backgroundColor) {
                        setConfig(prev => ({ ...prev, backgroundColor: data.project.backgroundColor }));
                    }

                    // Sync to local DB for offline access
                    try {
                        await dbOp('nodes', 'readwrite', 'clear');
                        for(const n of mappedNodes) await dbOp('nodes', 'readwrite', 'put', n);
                        await dbOp('edges', 'readwrite', 'clear');
                        for(const e of mappedEdges) await dbOp('edges', 'readwrite', 'put', e);
                        await dbOp('comments', 'readwrite', 'clear');
                        for(const c of mappedComments) await dbOp('comments', 'readwrite', 'put', c);
                    } catch(dbe) { console.warn("Local sync warn", dbe); }

                    // Add to history
                    if (data.history && Array.isArray(data.history)) {
                         // Map _id to id for history items
                         const mappedHistory = data.history.map((h: any) => ({
                             ...h,
                             id: h.id || h._id
                         }));
                         setHistory(mappedHistory);
                    }

                    setConnectionStatus('connected');
                    setIsLoading(false);
                    return;

               } catch (apiErr: any) {
                    console.error(`Attempt ${attempts + 1} failed`, apiErr);

                    // CRITICAL FIX: Handle Stale Auth / Deleted User scenario
                    const errMsg = apiErr.message || String(apiErr);
                    if (errMsg.includes('Unauthorized') || errMsg.includes('Invalid Token') || errMsg.includes('User not found') || errMsg.includes('jwt expired')) {
                         console.warn("Auth Session Inavlid. Resetting session.");
                         setLiveMode(false); // Force Local Mode
                         logout(); // Clear Stale Token
                         setIsLoading(false);
                         return;
                    }

                    attempts++;
                    if (attempts < maxAttempts) {
                        setConnectionStatus('reconnecting');
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        setConnectionStatus('failed'); // Triggers failure UI
                        setIsLoading(false);
                    }
               }
           }
        } else {
             // Local Mode
             setIsLoading(true);
             try {
                 if(isLiveMode && !shouldForce) return;
                 
                 const [n, e, c] = await Promise.all([
                    dbOp('nodes', 'readonly', 'getAll') as Promise<NodeData[]>,
                    dbOp('edges', 'readonly', 'getAll') as Promise<EdgeData[]>,
                    dbOp('comments', 'readonly', 'getAll') as Promise<Comment[]>
                ]);
                setNodes(n);
                setEdges(e);
                setComments(c);
                setConnectionStatus('connected');
             } catch(e) {
                 console.error("Local Load Failed", e);
             } finally {
                 setIsLoading(false);
             }
        }
    };

    const retryConnection = async () => {
        await refreshData(true);
    };

    // Reload when roomId changes
    useEffect(() => {
        refreshData(true);
        // Also clear history when changing rooms
        setHistory([]);
    }, [currentRoomId, isAuthenticated]);

    // Toggle Mode Logic
    useEffect(() => {
        // Always refresh data when switching modes to align with the new mode's source
        // If Live: refreshData() uses API. If Local: refreshData() uses LocalDB.
        refreshData();
    }, [isLiveMode]);
    
    const syncNodeChange = (node: NodeData) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('node:update', { roomId: currentRoomId, node });
    };

    const deleteRemoteNode = (id: string) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('node:delete', { roomId: currentRoomId, id });
    };

    const syncEdgeChange = (edge: EdgeData) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('edge:update', { roomId: currentRoomId, edge });
    };
    
    const deleteRemoteEdge = (id: string) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('edge:delete', { roomId: currentRoomId, id });
    };

    const syncCommentChange = (comment: Comment) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('comment:update', { roomId: currentRoomId, comment });
    };
    
    const deleteRemoteComment = (id: string) => {
        if (!socketRef.current || !isLiveMode) return;
        socketRef.current.emit('comment:delete', { roomId: currentRoomId, id });
    };
    
    // Check ReadOnly Mode
    const checkReadOnly = () => {
        if (isReadOnly) {
            // alert("Read Only Mode"); // Optional: UI feedback
            return true;
        }
        return false;
    };

    const addToHistory = (action: string, details: string, snapshot?: GraphSnapshot, isRevert: boolean = false) => {
        const newItem: HistoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            action,
            details,
            author: config.userProfile.name || 'Unknown',
            isRevertAction: isRevert,
            timestamp: Date.now(),
            snapshot
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50)); 
    };

    const clearHistory = async () => {
        if(checkReadOnly()) return;
        
        // Clear Local
         setHistory([]);

         // Clear Remote
         if (isLiveMode && currentRoomId) {
              try {
                  await api.delete(`/graph/${currentRoomId}/history`);
                  // Socket event is handled by backend emitting 'history:clear'
              } catch(e) {
                  console.error("Failed to clear remote history", e);
                  // Revert/Refresh on failure
                  refreshData(true);
                  alert((t && t('history.clearFailed')) || "Failed to clear remote history. Permissions might be insufficient.");
              }
         }
    };

    const restoreSnapshot = async (snapshot: any) => {
        if(checkReadOnly()) return;
        
        // If it's a Server History Item (has an ID but maybe no snapshot data directly if we optimized it out)
        if (snapshot.id && !snapshot.nodes && isLiveMode) {
             if (confirm("Revert this specific change on the server?")) {
                 try {
                     await api.post(`/graph/${currentRoomId}/history/${snapshot.id}/revert`, {});
                     // No need to reload, socket events will update graph
                 } catch(e) {
                     console.error("Revert Failed", e);
                     alert("Failed to revert change");
                 }
             }
             return;
        }

        // Local Snapshot Restore
        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
        setComments(snapshot.comments);
        
        if (isLiveMode && currentRoomId) {
            uploadFullGraphToBackend(currentRoomId, snapshot.nodes || [], snapshot.edges || [], snapshot.comments || [], true);
        } else {
            // Restore to Local DB
            (async () => {
                 await dbOp('nodes', 'readwrite', 'clear');
                 await dbOp('edges', 'readwrite', 'clear');
                 await dbOp('comments', 'readwrite', 'clear');
                 if(snapshot.nodes) for(const n of snapshot.nodes) await dbOp('nodes', 'readwrite', 'put', n);
                 if(snapshot.edges) for(const e of snapshot.edges) await dbOp('edges', 'readwrite', 'put', e);
                 if(snapshot.comments) for(const c of snapshot.comments) await dbOp('comments', 'readwrite', 'put', c);
            })();
        }
        // Mark this as a revert action so we can disable reverting TO a revert (optional, based on request?)
        // User said: "make not available to use revert... to that change that was reverted already"
        // Interpretation: Don't attach a snapshot to the 'Revert' action itself effectively disables it.
        addToHistory('Revert', 'Reverted to previous state', undefined, true);
    };

    const setGraphData = (newNodes: NodeData[], newEdges: EdgeData[], newComments?: Comment[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        if (newComments) setComments(newComments);

        // Async sync to local DB to keep it mirrored
        (async () => {
             // We can do a full replace or smart diff. Full replace is safer for "Sync".
             // However, performance might be an issue for large graphs on every update.
             // But setGraphData is usually called on initial load or full refresh.
             // Individual updates come via other channels? 
             // In firebase.ts, 'onValue' calls this. 'onValue' fires on ANY change.
             // So this will run on every node move if we listen to the granular paths.
             // BUT, in firebase.ts, we listen to `graphs/${roomId}/data`.
             // If we use 'onValue', we get the whole object.
             
             // To avoid freezing UI, we might want to debounce this or use requestIdleCallback.
             // For now, let's just do it directly but catch errors.
             
             try {
                 await dbOp('nodes', 'readwrite', 'clear');
                 await dbOp('edges', 'readwrite', 'clear');
                 await dbOp('comments', 'readwrite', 'clear');
                 
                 for(const n of newNodes) await dbOp('nodes', 'readwrite', 'put', n);
                 for(const e of newEdges) await dbOp('edges', 'readwrite', 'put', e);
                 if(newComments) for(const c of newComments) await dbOp('comments', 'readwrite', 'put', c);
             } catch(e) {
                 console.warn("Retaining local failed", e);
             }
        })();
    };

    const addComment = async (comment: Comment) => {
        // Comments are allowed in ReadOnly mode per user request
        setComments(prev => [...prev, comment]);
        
        // Always sync
        await dbOp('comments', 'readwrite', 'put', comment);

        if (currentRoomId) {
             api.put(`/graph/${currentRoomId}/comment`, { ...comment, id: comment.id }).catch(e => console.error("Mongo Add Comment Failed", e));
        }

        if (isLiveMode) {
            syncCommentChange(comment);
        }
    };

    const updateComment = async (comment: Comment) => {
        // Comments edit allowed? Let's say yes for now or check ownership?
        setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
        
        // Always sync
        await dbOp('comments', 'readwrite', 'put', comment);

        if (currentRoomId) {
             api.put(`/graph/${currentRoomId}/comment`, { ...comment, id: comment.id }).catch(e => console.error("Mongo Update Comment Failed", e));
        }

        if (isLiveMode) {
            syncCommentChange(comment);
        }
    };

    const deleteComment = async (id: string) => {
        setComments(prev => prev.filter(c => c.id !== id));
        
        // Always sync
        await dbOp('comments', 'readwrite', 'delete', id);

        if (currentRoomId) {
             api.delete(`/graph/${currentRoomId}/comment/${id}`).catch(e => console.error("Mongo Delete Comment Failed", e));
        }

        if (isLiveMode) {
            deleteRemoteComment(id);
        }
    };

    const addNode = async (node: NodeData) => {
        if (checkReadOnly()) return;

        const newNodes = [...nodes, node];
        // Optimistic
        setNodes(newNodes);
        
        // Always update local DB for offline backup/consistency
        await dbOp('nodes', 'readwrite', 'put', node);

        if (currentRoomId) {
             // Sync to Mongo
             api.put(`/graph/${currentRoomId}/node`, { ...node, id: node.id }).catch(e => console.error("Mongo Save Failed", e));
        }

        if (isLiveMode) {
            syncNodeChange(node);
            // Socket will send history:add event
        } else {
            addToHistory('Add Node', `Created node: ${node.title || node.id}`, { nodes: newNodes, edges, comments });
        }
    };

    const updateNode = async (node: NodeData) => {
        if (checkReadOnly()) return;
        
        const newNodes = nodes.map(n => n.id === node.id ? node : n);
        setNodes(newNodes);
        
        // Always update local DB
        await dbOp('nodes', 'readwrite', 'put', node);
        
        if (currentRoomId) {
             api.put(`/graph/${currentRoomId}/node`, { ...node, id: node.id }).catch(e => console.error("Mongo Update Failed", e));
        }

        if (isLiveMode) {
            syncNodeChange(node);
            // Socket will send history:add event
        } else {
            addToHistory('Update Node', `Updated node: ${node.title || node.id}`, { nodes: newNodes, edges, comments });
        }
    };

    const deleteNode = async (id: string) => {
        if (checkReadOnly()) return;
        
        const newNodes = nodes.filter(n => n.id !== id);
        const newEdges = edges.filter(e => {
             const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
             const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
             return s !== id && t !== id;
        });

        setNodes(newNodes);
        setEdges(newEdges);
        
        // Always update local DB
        await dbOp('nodes', 'readwrite', 'delete', id);
        const allEdges = await dbOp('edges', 'readonly', 'getAll') as EdgeData[];
        const toDelete = allEdges.filter(e => {
            const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
            const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
            return s === id || t === id;
        });
        for(const e of toDelete) await dbOp('edges', 'readwrite', 'delete', e.id);

        if (currentRoomId) {
             api.delete(`/graph/${currentRoomId}/node/${id}`).catch(e => console.error("Mongo Delete Failed", e));
        }

        if (isLiveMode) {
            deleteRemoteNode(id);
            // Also delete connected edges remotely
            const edgesToDelete = edges.filter(e => {
                 const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
                 const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
                 return s === id || t === id;
            });
            edgesToDelete.forEach(e => deleteRemoteEdge(e.id));
            // Socket handles history
        } else {
            addToHistory('Delete Node', `Deleted node: ${id}`, { nodes: newNodes, edges: newEdges, comments });
        }
    };


    const addEdge = async (edge: EdgeData) => {
        if (checkReadOnly()) return;
        
        const newEdges = [...edges, edge];
        // Optimistic State
        setEdges(newEdges);

        // Always sync to Local DB
        await dbOp('edges', 'readwrite', 'put', edge);

        if (currentRoomId) {
             api.put(`/graph/${currentRoomId}/edge`, { ...edge, id: edge.id }).catch(e => console.error("Mongo Add Edge Failed", e));
        }
        
        if (isLiveMode) {
            syncEdgeChange(edge);
            // Socket handles history
        } else {
            // await refreshData(true); // Redundant if we updated state above
            addToHistory('Add Edge', `Connected nodes`, { nodes, edges: newEdges, comments });
        }
    };

    const updateEdge = async (edge: EdgeData) => {
        if (checkReadOnly()) return;

        const newEdges = edges.map(e => e.id === edge.id ? edge : e);
        setEdges(newEdges);

        // Always sync to Local DB
        await dbOp('edges', 'readwrite', 'put', edge);
        
        if (currentRoomId) {
             api.put(`/graph/${currentRoomId}/edge`, { ...edge, id: edge.id }).catch(e => console.error("Mongo Update Edge Failed", e));
        }

        if (isLiveMode) {
             syncEdgeChange(edge);
             addToHistory('Add Edge', `Updated connection`, { nodes, edges: newEdges, comments });
        } else {
            addToHistory('Update Edge', `Updated connection`, { nodes, edges: newEdges, comments });
        }
    };

    const deleteEdge = async (id: string) => {
        if (checkReadOnly()) return;
        
        const newEdges = edges.filter(e => e.id !== id);
        setEdges(newEdges);

        // Always sync to Local DB
        await dbOp('edges', 'readwrite', 'delete', id);

        if (currentRoomId) {
             api.delete(`/graph/${currentRoomId}/edge/${id}`).catch(e => console.error("Mongo Delete Edge Failed", e));
        }

        if (isLiveMode) {
            deleteRemoteEdge(id);
            addToHistory('Delete Edge', `Removed connection`, { nodes, edges: newEdges, comments });
        } else {
            addToHistory('Delete Edge', `Removed connection`, { nodes, edges: newEdges, comments });
        }
    };

    const updateConfig = (newConfig: AppSettings) => {
        setConfig(newConfig);
        localStorage.setItem('app_config', JSON.stringify(newConfig));
    };

    const updateProjectBackground = async (color: string) => {
        // Optimistic Update
        setConfig(prev => ({ ...prev, backgroundColor: color }));
        
        if (currentRoomId && isLiveMode) {
            try {
                await api.put(`/graph/${currentRoomId}/background`, { color });
            } catch(e) {
                console.error("Backgound Sync Failed", e);
            }
        }
        
        // Also save to local storage as fallback/default for local
        if (!currentRoomId) {
             const newConf = { ...config, backgroundColor: color };
             localStorage.setItem('app_config', JSON.stringify(newConf));
        }
    };

    const t = (key: string) => getTranslation(config.language as any || 'en', key);

    return (
        <GraphContext.Provider value={{
            nodes, edges, comments, config, isLoading, connectionStatus, retryConnection,
            setNodes, setEdges,
            addNode, updateNode, deleteNode,
            addEdge, updateEdge, deleteEdge,
            addComment, updateComment, deleteComment,
            refreshData,
            currentRoomId, setCurrentRoomId,
            activeCommentId, setActiveCommentId,
            updateConfig, updateProjectBackground,
            isLiveMode, setLiveMode, setGraphData,
            history, addToHistory, restoreSnapshot,
            isReadOnly, setReadOnly,
            t, isAuthenticated, authProvider, savedProjects, activeUsers, login, logout,
            isTransitioningToLive, setTransitioningToLive, clearHistory,
            isUserVisible, toggleUserVisibility
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
