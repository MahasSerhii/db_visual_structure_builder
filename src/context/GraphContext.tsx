import  { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { NodeData, EdgeData, ProjectConfig, Comment, UserProfile, ActiveSessionUser, SavedProject, Language } from '../utils/types';
import { AuthUser } from '../api/apiTypes';
import { dbOp, initDB, deleteWholeDB } from '../utils/indexedDB';
import { getTranslation } from '../utils/translations';
// import { api, uploadFullGraphToBackend } from '../utils/api'; // Deprecated
import { authApi } from '../api/auth';
import { graphApi } from '../api/graph';
import { io, Socket } from 'socket.io-client';
import { useWorkspace } from './WorkspaceContext'; // Integration with Workspace Tabs

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'failed'; 

interface GraphContextType {
    tabId?: string; // Identity of the tab
    nodes: NodeData[];
    edges: EdgeData[];
    comments: Comment[];
    config: Partial<UserProfile>;
    userProfile: UserProfile;
    userId: string | null;
    mySocketId: string | null;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
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
    updateConfig: (newConfig: Partial<UserProfile>) => void;
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
    activeUsers: ActiveSessionUser[];
    isUserVisible: boolean;
    toggleUserVisibility: () => void;
    authProvider: 'email' | 'google' | 'apple';
    savedProjects: SavedProject[];
    login: (token: string, email: string, name?: string, provider?: 'email' | 'google' | 'apple', projects?: SavedProject[], userProfile?: Partial<AuthUser>) => void;
    logout: () => Promise<void>;
    clearHistory: () => Promise<void>;
    sessionConflict: boolean;
    resolveSessionConflict: (force: boolean) => void;
    sessionKicked: boolean;
    acknowledgeSessionKicked: () => void;
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

export const GraphProvider = ({ children, initialRoomId, tabId }: { children: ReactNode; initialRoomId?: string; tabId?: string }) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
    const connectionStatusRef = useRef(connectionStatus);
    useEffect(() => { connectionStatusRef.current = connectionStatus; }, [connectionStatus]);
    
    // Persistence: Initialize from LocalStorage or Prop
    const [currentRoomId, _setCurrentRoomId] = useState<string | null>(() => {
        // If this is a specific tab initialization (multi-tab mode), prioritize its prop
        if (initialRoomId !== undefined) { 
             return initialRoomId; 
        }
        // ONLY fallback to local storage if NO explicit initialRoomId (not even null) was passed.
        // In the workspace layout, we pass null explicitly for new tabs.
        // However, standard React behavior treats undefined as "absent".
        // The WorkspaceLayout passes "tab.roomId || undefined". 
        // If tab.roomId is null, it passes undefined, so this falls back to localStorage.
        // We need to FIX WorkspaceLayout to pass null instead of undefined if we want to avoid fallback.
        // BUT actually, let's just NOT use localStorage for room ID initialization in multi-tab mode ever.
        // The global localStorage 'current_room_id' is conceptually flawed for multi-tab.
        
        // Strategy: 
        // 1. If we are in a tabbed environment (tabId is present), we should NEVER use the global localStorage `current_room_id` for initialization.
        //    Instead, we rely entirely on `initialRoomId`.
        if (tabId) {
            return initialRoomId || null;
        }

        // 2. Legacy fallback for non-tabbed usage
        return localStorage.getItem('current_room_id');
    });

    // --- WORKSPACE INTEGRATION ---
    // Safely attempt to sync with workspace tabs.
    // In a multi-tab environment, we must keep the workspace state in sync with the internal graph state.
    const { updateTab } = useWorkspace(); 

    // -----------------------------

    const [isLiveMode, _setLiveMode] = useState(() => {
        // In Multi-Tab mode, we generally do NOT want global live mode persistence 
        // because it causes new tabs to instantly try to go live.
        // Each tab needs to decide if it's live based on whether it has a roomId.
        if (tabId) {
            // If we have an initialRoomId, we assume we want to be live.
            // If we don't (new tab), we start offline.
            return !!initialRoomId;
        }

        // Legacy behavior for single-window apps
        return localStorage.getItem('is_live_mode') === 'true';
    });
    
    // Sync RoomID and LiveStatus to Tab Title/Metadata
    useEffect(() => {
        if (tabId) {
            updateTab(tabId, { 
                roomId: currentRoomId,
                isLive: isLiveMode
            });
        }
    }, [currentRoomId, isLiveMode, tabId, updateTab]);

    const [isTransitioningToLive, setTransitioningToLive] = useState(false);

    const setCurrentRoomId = useCallback((id: string | null) => {
        _setCurrentRoomId(id);
        
        // Only persist to global storage if NOT in tabbed mode
        // Or perhaps we just stop using this global key altogether to avoid confusion?
        if (!tabId) {
            if (id) localStorage.setItem('current_room_id', id);
            else localStorage.removeItem('current_room_id');
        }
    }, [tabId]);

    const setLiveMode = useCallback((isLive: boolean) => {
        _setLiveMode(isLive);
        
        // Only persist to global storage if NOT in tabbed mode
        if (!tabId) {
            localStorage.setItem('is_live_mode', String(isLive));
        }

        if (!isLive) {
            setConnectionStatus('connected'); // Reset failed/connecting status when switching to local
        } else {
             // Trigger connect logic implicitly by letting effects run 
             // but we might want to set status to connecting to show loader immediately
             setConnectionStatus(prev => prev === 'failed' ? 'connecting' : prev); // Reset failed if retrying live
        }
    }, [tabId]);

    // New ReadOnly Access State
    const [isReadOnly, setReadOnly] = useState(false);

    // We keep local data in a ref or separate state to switch back

    const [userProfile, setUserProfile] = useState<UserProfile>(() => ({
        name: localStorage.getItem('my_user_name') || '', 
        color: localStorage.getItem('my_user_color') || '#6366F1', 
        lastUpdated: 0 
    }));
    const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('my_user_id'));

    const [config, setConfig] = useState<Partial<UserProfile>>(() => {
        try {
            const saved = localStorage.getItem('app_config');
            if (saved) {
                const parsed = JSON.parse(saved); 
                // Migration: Check for legacy nested structure if loading old config
                return {
                    language: parsed.language || 'en',
                    theme: parsed.theme || 'light',
                    componentBg: parsed.componentBg || '#6366F1',
                    propertyText: parsed.propertyText || '#000000',
                    canvasBg: parsed.canvasBg || '#f8fafc'
                };
            }
        } catch (e) {
             console.warn("Could not load app_config", e);
        }
        return {
            language: 'en',
            theme: 'light',
            componentBg: '#6366F1',
            propertyText: '#000000',
            canvasBg: '#f8fafc'
        };
    });
    
    // Helper to update user profile locally and persisting to match expectations/logic
    const updateUserProfile = (profile: Partial<UserProfile>) => {
        setUserProfile(prev => {
            const next = { ...prev, ...profile, lastUpdated: Date.now() };
            if (next.name && next.name !== 'User') {
                 localStorage.setItem('my_user_name', next.name);
            }
            if (next.color) {
                 localStorage.setItem('my_user_color', next.color);
            }
            return next;
        });
    };
    
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
    
    // Check for missing ID on auth restore
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const currentId = localStorage.getItem('my_user_id');
        if (token && !currentId) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.id) {
                    localStorage.setItem('my_user_id', payload.id);
                    setUserId(payload.id);
                }
            } catch (e) {
                void e;
                console.warn("Could not restore User ID from token");
            }
        }
    }, [isAuthenticated]);

    // Restore User Profile from Backend on Mount/Auth
    useEffect(() => {
        if (isAuthenticated) {
            authApi.getUser()
                .then(response => {
                    const u = response.user;
                    if (u) {
                        // HEAL: If server sends default color but local has custom, prefer local & sync
                        const storedColor = localStorage.getItem('my_user_color');
                        let finalColor = u.color || '#6366F1';
                        
                        // Check if we strictly have a better color locally
                        if (storedColor && storedColor !== '#6366F1' && finalColor === '#6366F1') {
                            console.log("Healing User Color: Restoring locally cached color override against server default.");
                            finalColor = storedColor; // Keep local custom color
                            authApi.updateProfile({ color: finalColor }).catch(() => {});
                        }

                        setUserProfile(prev => ({
                            ...prev,
                            // Ensure we merge to keep any local optimistic updates if any
                            name: u.name,
                            color: finalColor,
                            language: u.language,
                            theme: u.theme as 'light'|'dark',
                            componentBg: u.componentBg,
                            propertyText: u.propertyText,
                            canvasBg: u.canvasBg,
                            lastUpdated: u.profileUpdatedAt || Date.now()
                        }));

                        // Restore Configuration State from User Profile
                        setConfig(prev => {
                            const next = { ...prev };
                            if (u.language) next.language = u.language;
                            if (u.theme) next.theme = u.theme as 'light'|'dark';
                            if (u.componentBg) next.componentBg = u.componentBg;
                            if (u.propertyText) next.propertyText = u.propertyText;
                            if (u.canvasBg) next.canvasBg = u.canvasBg;
                            return next;
                        });

                        // Cache basic identity
                        localStorage.setItem('my_user_name', u.name);
                        localStorage.setItem('my_user_color', finalColor);
                    }
                    
                    // Restore Projects (Sync if available)
                    if (response.projects && Array.isArray(response.projects)) {
                         setSavedProjects(response.projects as SavedProject[]);
                         localStorage.setItem('saved_projects', JSON.stringify(response.projects));
                    }
                })
                .catch(e => console.warn("Background Profile Fetch Failed", e));
        }
    }, [isAuthenticated]);
    
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
        try {
            const saved = localStorage.getItem('saved_projects');
            return saved ? JSON.parse(saved) : [];
        } catch(e) { void e; return []; }
    });
    const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'apple'>(() => 
        (localStorage.getItem('auth_provider') as 'email' | 'google' | 'apple') || 'email'
    );

    // Socket.IO Setup
    const socketRef = useRef<Socket | null>(null);
    const [mySocketId, setMySocketId] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState<ActiveSessionUser[]>([]);

    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace('/api', '');
        const socket = io(socketUrl); 
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("Socket Connected", socket.id);
            setMySocketId(socket.id || null);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const [sessionConflict, setSessionConflict] = useState(false);
    const [sessionKicked, setSessionKicked] = useState(false);



    const acknowledgeSessionKicked = useCallback(() => {
        setSessionKicked(false);
    }, []);

    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        const handleJoinRoom = () => {
             if (currentRoomId && isAuthenticated) {
                 // Ensure we don't send empty/default profiles if we have them stored but not loaded in state yet?
                 // Actually relying on 'userProfile' state is best, as it updates when storage loads.
                 const sessionUserName = userProfile.name || localStorage.getItem('my_user_name') || 'Anonymous';
                 const sessionUserId = localStorage.getItem('my_user_id'); // Stabilize identity
                 
                 // Reset conflict state on new attempt
                 setSessionConflict(false);

                 socket.emit('join-room', {
                     roomId: currentRoomId,
                     userId: sessionUserId, // Use stable ID for deduplication
                     userName: sessionUserName,
                     userColor: userProfile.color,
                     userEmail: (authProvider === 'email' ? 'hidden' : undefined),
                     isVisible: isUserVisible,
                     force: false
                 });
             }
        };

        if (currentRoomId && isAuthenticated) {
             handleJoinRoom();

             // Re-join logic on connection restore
             socket.on('connect', handleJoinRoom);
             
             socket.on('presence:update', (users: ActiveSessionUser[]) => {
                 setActiveUsers(users);
             });
             
             const handleNodeUpdate = (n: NodeData) => {
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
                     const s = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
                     const t = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
                     return s !== id && t !== id;
                 }));
             };

             const handleEdgeUpdate = (e: EdgeData) => {
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
             
             const handleCommentUpdate = (c: Comment) => {
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
             socket.on('session:duplicate', (data: { message: string }) => {
                 console.warn("Duplicate session detected. Disconnecting.");
                 setLiveMode(false);
                 setCurrentRoomId(null);
                 setConnectionStatus('failed');
                 setIsLoading(false);
                 
                 // Clear session to prevent auto-reconnect
                 sessionStorage.removeItem('room_id_session');
                 
                 // Show Modal via state instead of Alert
                 setSessionKicked(true);
             });
             socket.on('room:cleared', () => {
                 setNodes([]);
                 setEdges([]);
                 setComments([]);
                 // Optionally clear history too if backend clears it?
                 // Usually clear room implies clearing history or at least invalidating it.
                 // Backend implementation below will show if we clear history.
             });

             socket.on('user:removed', (data: { userId: string; message?: string }) => {
                 const myUserId = localStorage.getItem('my_user_id');
                 
                 // 1. Update Active Users List locally for everyone (removes ghost user immediately)
                 setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));

                 // 2. Handle Self Removal
                 if (data.userId && myUserId && data.userId.toString() === myUserId.toString()) {
                      console.warn("User removed from project. Disconnecting...");
                      setLiveMode(false);
                      setCurrentRoomId(null);
                      setConnectionStatus('failed'); // Prevent reconnects
                      setIsLoading(false);
                      
                      // Clear session to prevent auto-reconnect
                      sessionStorage.removeItem('room_id_session'); 
                      
                      // Clean URL parameters to prevent re-joining on refresh
                      const url = new URL(window.location.href);
                      url.searchParams.delete('room');
                      url.searchParams.delete('config');
                      url.searchParams.delete('token');
                      window.history.replaceState({}, document.title, url.pathname);

                      // Optional: Show Toast or Modal instead of Alert
                      alert(data.message || "You have been removed from this project.");
                      
                      // Do NOT reload. Just behave as disconnected.
                 }
             });
             
             socket.on('session:conflict', () => {
                 console.warn("Session Conflict Detected");
                 // We don't change mode yet, just trigger the modal
                 setSessionConflict(true);
                 setIsLoading(false); // Stop loading spinner
             });

             socket.on('project:settings', (data: { config?: ProjectConfig; backgroundColor?: string }) => {
                 setConfig(prev => {
                     const next = { ...prev };
                     
                     // 1. Handle Background Color update (top priority override if present)
                     if (data.backgroundColor) {
                         next.canvasBg = data.backgroundColor;
                     }
                     
                     // 2. Handle Config update (merge carefully)
                     if (data.config) {
                         // Warning: data.config from project settings only contains project-scoped values (canvasBg).
                         // We must NOT overwrite local user preferences (componentBg, propertyText) which are missing in data.config
                         
                         if (data.config.canvasBg) {
                             next.canvasBg = data.config.canvasBg;
                         }
                     }
                     return next;
                 });
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
                 socket.off('session:duplicate');
                 socket.off('edge:update', handleEdgeUpdate);
                 socket.off('edge:delete', handleEdgeDelete);
                 socket.off('comment:update', handleCommentUpdate);
                 socket.off('comment:delete', handleCommentDelete);
                 socket.off('history:add', handleHistoryAdd);
                 socket.off('history:clear', handleHistoryClear);
                 socket.off('user:removed');
                 socket.off('presence:update');
             };
        }
    }, [currentRoomId, isAuthenticated, userProfile.name, userProfile.color, isUserVisible, authProvider, setCurrentRoomId, setLiveMode]); // Re-join if profile changes



    const login = (token: string, email: string, name?: string, provider: 'email' | 'google' | 'apple' = 'email', projects: SavedProject[] = [], dbUserProfile?: Partial<AuthUser>) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_provider', provider);
        localStorage.setItem('saved_projects', JSON.stringify(projects));
        setIsAuthenticated(true);
        setAuthProvider(provider);
        setSavedProjects(projects);

        // Sync Logic: Compare Local vs Server Timestamp
        const serverTime = dbUserProfile?.profileUpdatedAt ? new Date(dbUserProfile.profileUpdatedAt).getTime() : 0;
        const localTime = userProfile.lastUpdated || 0;
        
        // If Server is newer OR Local is uninitialized (0) -> Use Server Profile
        if ((serverTime > localTime || localTime === 0) && dbUserProfile) {
            console.log("Syncing Profile from Server");
            const merged = { ...userProfile };
            if (dbUserProfile.name) merged.name = dbUserProfile.name;
            if (dbUserProfile.color) merged.color = dbUserProfile.color;
            // Cache User Preferences into UserProfile state
            if (dbUserProfile.language) merged.language = dbUserProfile.language;
            if (dbUserProfile.theme) merged.theme = (dbUserProfile.theme as 'light' | 'dark'); // Cast as schema is strict
            if (dbUserProfile.componentBg) merged.componentBg = dbUserProfile.componentBg;
            if (dbUserProfile.propertyText) merged.propertyText = dbUserProfile.propertyText;
            if (dbUserProfile.canvasBg) merged.canvasBg = dbUserProfile.canvasBg;
            
            merged.lastUpdated = serverTime || Date.now();

            setUserProfile(merged);
            localStorage.setItem('my_user_name', merged.name);
            if (merged.color) localStorage.setItem('my_user_color', merged.color);
            if (dbUserProfile.id) {
                const uid = dbUserProfile.id;
                localStorage.setItem('my_user_id', uid);
                setUserId(uid);
            }
            // Sync Preferences
            const newConfig = { ...config };
            
            let hasConfigChange = false;
            
            if (dbUserProfile.language && dbUserProfile.language !== config.language) {
                newConfig.language = dbUserProfile.language;
                hasConfigChange = true;
            }
            if (dbUserProfile.theme && dbUserProfile.theme !== config.theme) {
                newConfig.theme = (dbUserProfile.theme as 'light' | 'dark');
                hasConfigChange = true;
            }
            if (dbUserProfile.componentBg) {
                newConfig.componentBg = dbUserProfile.componentBg;
                hasConfigChange = true;
            }
            if (dbUserProfile.propertyText) {
                newConfig.propertyText = dbUserProfile.propertyText;
                hasConfigChange = true;
            }
            
            // Always prioritize Server Config on Login
            if (dbUserProfile.canvasBg) {
                 newConfig.canvasBg = dbUserProfile.canvasBg;
                 hasConfigChange = true;
            }

            if (hasConfigChange) {
                setConfig(newConfig);
                localStorage.setItem('app_config', JSON.stringify(newConfig));
            }

        } else if (dbUserProfile) {
             // Fallback: Even if timestamp check failed or local was "newer" (but potentially default),
             // we should trust the Server for Preferences if they exist.
             const newConfig = { ...config };
             let hasChange = false;
             
             if (dbUserProfile.componentBg) { newConfig.componentBg = dbUserProfile.componentBg; hasChange = true; }
             if (dbUserProfile.propertyText) { newConfig.propertyText = dbUserProfile.propertyText; hasChange = true; }
             if (dbUserProfile.canvasBg) { newConfig.canvasBg = dbUserProfile.canvasBg; hasChange = true; }
             if (dbUserProfile.theme) { newConfig.theme = dbUserProfile.theme as 'light'|'dark'; hasChange = true; }

             if (hasChange) {
                 setConfig(newConfig);
                 localStorage.setItem('app_config', JSON.stringify(newConfig));
             }
             
             // Also populate UserProfile state
              setUserProfile(prev => ({
                 ...prev,
                 componentBg: dbUserProfile.componentBg || prev.componentBg,
                 propertyText: dbUserProfile.propertyText || prev.propertyText,
                 canvasBg: dbUserProfile.canvasBg || prev.canvasBg,
                 // Ensure we restore Color and Name explicitly if missing or default
                 color: dbUserProfile.color || prev.color || '#6366F1',
                 name: dbUserProfile.name || prev.name || 'User',
                 theme: (dbUserProfile.theme as 'light'|'dark') || prev.theme,
             }));
             
             // Local is newer logic...
             if (localTime > serverTime) {
                 // ... keep existing push logic
                 authApi.updateProfile({ 
                        name: userProfile.name, 
                        color: userProfile.color, 
                        profileUpdatedAt: localTime 
                    })
                 .catch(e => console.warn("Auto-sync profile failed", e));
             }

             // Base logic:
             let finalName = userProfile.name;
             // If local name is empty/default, adopt login name
             if (!finalName || finalName === 'User' || finalName === '') {
                 finalName = name || email.split('@')[0];
             }
             
             // Check if we should adopt color if local is default
             let finalColor = userProfile.color;
             if ((!finalColor || finalColor === '#6366F1') && dbUserProfile?.color) {
                 finalColor = dbUserProfile.color;
             }


             // FORCE UPDATE: If dbUserProfile has a color, we should probably prefer it over local state 
             // in this fallback block, because we just determined local state might be stale/default.
             if (dbUserProfile?.name) {
                 finalName = dbUserProfile.name;
             }
             if (dbUserProfile?.color) {
                 finalColor = dbUserProfile.color;
             }

             if (finalName !== userProfile.name || finalColor !== userProfile.color) {
                 const updated = { 
                    ...userProfile, 
                    name: finalName,
                    color: finalColor
                };
                setUserProfile(updated);
             }
             localStorage.setItem('my_user_name', finalName);
             localStorage.setItem('my_user_color', finalColor);
        } else {
            // Local is newer -> Push to Server
             if (localTime > serverTime) {
                 authApi.updateProfile({ 
                        name: userProfile.name, 
                        color: userProfile.color, 
                        profileUpdatedAt: localTime 
                    })
                 .catch(e => console.warn("Auto-sync profile failed", e));
             } else {
                 // Check local storage fallback if provided arguments are empty
                 const localN = localStorage.getItem('my_user_name');
                 const localC = localStorage.getItem('my_user_color');
                 if(localN && userProfile.name !== localN) setUserProfile(p=>({...p, name: localN}));
                 if(localC && userProfile.color !== localC) setUserProfile(p=>({...p, color: localC}));
             }
        }
        
        if (dbUserProfile && dbUserProfile._id) {
            localStorage.setItem('my_user_id', dbUserProfile._id);
        }
    };

    const logout = useCallback(async () => {
        // 0. Notify Backend to clear sessions
        if (socketRef.current) {
            socketRef.current.emit('auth:logout');
        }
        
        // Give backend a moment to process logout before cutting client
        await new Promise(r => setTimeout(r, 100));

        // 1. Clear IndexedDB (Best Effort)
        try {
            await deleteWholeDB();
        } catch(e: unknown) {
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
        localStorage.removeItem('my_user_name');
        localStorage.removeItem('my_user_color');

        // 3. Reset State
        setIsAuthenticated(false);
        setSavedProjects([]);
        setNodes([]);
        setEdges([]);
        setComments([]);
        setUserProfile({ name: 'User', color: '#6366F1' });
        
        // 4. Force Reload to ensure clean slate AND strip query params (token, room, etc.)
        // This prevents auto-relogin from URL params
        window.location.href = window.location.origin + window.location.pathname;
    }, []);

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
                        
                        const storedName = localStorage.getItem('my_user_name');
                        const storedColor = localStorage.getItem('my_user_color');
                         if (storedName || storedColor) {
                            setUserProfile(prev => ({ 
                                ...prev, 
                                name: storedName || prev.name,
                                color: storedColor || prev.color
                            }));
                        }
                        
                        // Merge with default to ensure new fields exist
                         setConfig(prev => ({ 
                             ...prev, 
                             ...parsed
                         }));
                    } catch(e) { console.error("Config Parse Error", e); }
                } else {
                    // No saved config, try to use stored name
                    const storedName = localStorage.getItem('my_user_name');
                    const storedColor = localStorage.getItem('my_user_color');
                    if (storedName || storedColor) {
                        setUserProfile(prev => ({ 
                            ...prev, 
                            name: storedName || prev.name,
                            color: storedColor || prev.color
                        }));
                    }
                }

                // If authenticated, fetch latest profile from server to ensure sync
                const token = localStorage.getItem('auth_token');
                if (token) {
                     authApi.getUser()
                        .then(res => {
                            if (res && res.user) {
                                const u = res.user;
                                if (u._id) localStorage.setItem('my_user_id', u._id);
                                
                                setUserProfile(prev => {
                                    const next = {
                                        ...prev,
                                        name: u.name || prev.name,
                                        color: u.color || prev.color,
                                        lastUpdated: Date.now()
                                    };
                                    // Also update the 'my_user_name' to keep it in sync for offline mode
                                    if(u.name && u.name !== 'User') {
                                        localStorage.setItem('my_user_name', u.name);
                                    }
                                    return next;
                                });
                            }
                        })
                        .catch(err => console.warn("Background Profile Sync Failed", err));
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

    const refreshData = useCallback(async (shouldForce = false) => {
        if (connectionStatusRef.current === 'failed' && !shouldForce) return;

        console.log(`[GraphContext] refreshData (Force: ${shouldForce}) - Room: ${currentRoomId}, Auth: ${isAuthenticated}, Live: ${isLiveMode}`);

        // CRITICAL FIX: Only fetch from Backend if we are strictly in Live Mode.
        // If we are in Local Mode (even with a RoomID set), we must use LocalDB.
        if (currentRoomId && isAuthenticated && isLiveMode) {
           setIsLoading(true);
           setConnectionStatus('connecting'); 
           
           let attempts = 0;
           const maxAttempts = 3;

           while (attempts < maxAttempts) {
               try {
                    console.log(`[GraphContext] Fetching Graph... Attempt ${attempts + 1}`);
                    const data = await graphApi.getGraph(currentRoomId);
                    // Transform backend nodeId -> id (already handled by backend mapping usually, but sticking to NodeData type)
                    const mappedNodes = data.nodes;
                    const mappedEdges = data.edges;
                    const mappedComments = data.comments;

                    setNodes(mappedNodes);
                    setEdges(mappedEdges);
                    setComments(mappedComments);
                    
                    if (data.project) {
                        const projConf: ProjectConfig = (data.project.config as ProjectConfig) || {};
                        // Merge Strategy:
                        // 1. Keep current User Preferences (lang, theme, etc) from `prev` (which is sync'd from User Profile)
                        // 2. Adopt Project-specific Settings (canvasBg) from Project Config if present.
                        // 3. Fallback to User Preference if Project has no canvasBg.
                        
                        setConfig(prev => {
                            const newC = { ...prev };
                            
                            // Check Canvas Background Priority
                            if (projConf.canvasBg) {
                                newC.canvasBg = projConf.canvasBg;
                            } else {
                                // Fallback to User Preference if available
                                if (userProfile.canvasBg) {
                                    newC.canvasBg = userProfile.canvasBg;
                                }
                            }
                            
                            // Restore User Preferences for other values
                            if (userProfile.language) newC.language = userProfile.language as string;
                            if (userProfile.theme) newC.theme = (userProfile.theme as 'light' | 'dark');
                            if (userProfile.componentBg) newC.componentBg = userProfile.componentBg;
                            if (userProfile.propertyText) newC.propertyText = userProfile.propertyText;
                            
                            return newC;
                        });
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
                         const mappedHistory = data.history.map((h: unknown) => {
                             const item = h as Partial<HistoryItem> & { _id?: string };
                             return {
                                 ...item,
                                 id: item.id || item._id || 'unknown'
                             } as HistoryItem;
                         });
                         setHistory(mappedHistory);
                    }

                    setConnectionStatus('connected');
                    setIsLoading(false);
                    return;

               } catch (apiErr) {
                    console.error(`Attempt ${attempts + 1} failed`, apiErr);

                    // CRITICAL FIX: Handle Stale Auth / Deleted User scenario
                    const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
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
                         // Check if error is specifically NO_ACCESS (403 or similar)
                         // The apiErr object might have response data if it's an axios/fetch error wrapper
                         if (errMsg.includes('NO_ACCESS') || errMsg.includes('no access') || errMsg.includes('403')) {
                             setConnectionStatus('failed'); // or disconnected
                             // setLiveMode(false); // Maybe force offline?
                             // Don't clear room ID immediately so user sees where they failed? 
                             // Or clear it as requested:
                             setCurrentRoomId(null);
                             sessionStorage.removeItem('room_id_session');
                             
                             // Clean URL parameters
                             const url = new URL(window.location.href);
                             url.searchParams.delete('room');
                             url.searchParams.delete('token');
                             window.history.replaceState({}, document.title, url.pathname);

                             alert("You don't have access to this room.");
                             setIsLoading(false);
                             return;
                         }

                        setConnectionStatus('failed'); // Triggers failure UI
                        setIsLoading(false);
                        
                        // Clean URL on permanent failure to prevent F5 loops
                        // Only if we suspect access issue (404/Empty graph is not access issue per se, but connection failed usually implies it after retries)
                        // Actually, let's just leave the URL alone unless it's strictly NO_ACCESS
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
    }, [currentRoomId, isAuthenticated, isLiveMode, logout, setCurrentRoomId, setLiveMode]); // Removed connectionStatus from deps to avoid loop
    
    // We need to trigger the force logic
    const resolveSessionConflict = useCallback((force: boolean) => {
         if (!socketRef.current || !currentRoomId) return;
         if (force) {
             const sessionUserName = userProfile.name || localStorage.getItem('my_user_name') || 'Anonymous';
             const sessionUserId = localStorage.getItem('my_user_id'); 
             
             // Emit force join
             socketRef.current.emit('join-room', {
                 roomId: currentRoomId,
                 userId: sessionUserId,
                 userName: sessionUserName,
                 userColor: userProfile.color,
                 userEmail: (authProvider === 'email' ? 'hidden' : undefined),
                 isVisible: isUserVisible,
                 force: true
             });
             setSessionConflict(false);
             
             // FORCE UI REFRESH
             setConnectionStatus('connecting'); 
             
             // Trigger a data refresh to ensure socket listeners are re-bound if needed
             setTimeout(() => {
                 refreshData(true);
             }, 100);

         } else {
             // User canceled - disconnect
             setSessionConflict(false);
             setLiveMode(false);
             setCurrentRoomId(null);
             socketRef.current.disconnect();
         }
    }, [currentRoomId, userProfile, authProvider, isUserVisible, setLiveMode, setCurrentRoomId, refreshData]);

    const retryConnection = async () => {
        await refreshData(true);
    };

    // Reload when roomId changes
    useEffect(() => {
        refreshData(true);
        // Also clear history when changing rooms
        setHistory([]);
    }, [currentRoomId, isAuthenticated, refreshData]);

    // Toggle Mode Logic
    useEffect(() => {
        // Always refresh data when switching modes to align with the new mode's source
        // If Live: refreshData() uses API. If Local: refreshData() uses LocalDB.
        console.log("[GraphContext] Mode toggled. Refreshing data (Forced).");
        refreshData(true);
    }, [isLiveMode, refreshData]);
    
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
            author: userProfile.name || 'Unknown',
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
                  await graphApi.clearHistory(currentRoomId);
                  // Socket event is handled by backend emitting 'history:clear'
              } catch(e) {
                  console.error("Failed to clear remote history", e);
                  // Revert/Refresh on failure
                  refreshData(true);
                  alert((t && t('history.clearFailed')) || "Failed to clear remote history. Permissions might be insufficient.");
              }
         }
    };

    const restoreSnapshot = async (snapshot: Partial<HistoryItem & GraphSnapshot>) => {
        if(checkReadOnly()) return;
        
        // If it's a Server History Item (has an ID but maybe no snapshot data directly if we optimized it out)
        if (snapshot.id && !snapshot.nodes && isLiveMode) {
             if (confirm("Revert this specific change on the server?")) {
                 try {
                     await graphApi.revertHistory(currentRoomId!, snapshot.id);
                     // No need to reload, socket events will update graph
                 } catch(e) {
                     console.error("Revert Failed", e);
                     alert("Failed to revert change");
                 }
             }
             return;
        }

        // Local Snapshot Restore
        setNodes(snapshot.nodes || []);
        setEdges(snapshot.edges || []);
        setComments(snapshot.comments || []);
        
        if (isLiveMode && currentRoomId) {
            graphApi.syncGraph(currentRoomId, {
                nodes: snapshot.nodes || [],
                edges: snapshot.edges || [],
                comments: snapshot.comments || []
            }, true);
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
             graphApi.addComment(currentRoomId, comment).catch(e => console.error("Mongo Add Comment Failed", e));
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
             graphApi.updateComment(currentRoomId, comment).catch(e => console.error("Mongo Update Comment Failed", e));
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
             graphApi.deleteComment(currentRoomId, id).catch(e => console.error("Mongo Delete Comment Failed", e));
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
             graphApi.addNode(currentRoomId, node).catch(e => console.error("Mongo Save Failed", e));
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
             graphApi.updateNode(currentRoomId, node).catch(e => console.error("Mongo Update Failed", e));
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
             const s = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
             const t = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
             return s !== id && t !== id;
        });

        setNodes(newNodes);
        setEdges(newEdges);
        
        // Always update local DB
        await dbOp('nodes', 'readwrite', 'delete', id);
        const allEdges = await dbOp('edges', 'readonly', 'getAll') as EdgeData[];
        const toDelete = allEdges.filter(e => {
            const s = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
            const t = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
            return s === id || t === id;
        });
        for(const e of toDelete) await dbOp('edges', 'readwrite', 'delete', e.id);

        if (currentRoomId) {
             graphApi.deleteNode(currentRoomId, id).catch(e => console.error("Mongo Delete Failed", e));
        }

        if (isLiveMode) {
            deleteRemoteNode(id);
            // Also delete connected edges remotely
            const edgesToDelete = edges.filter(e => {
                 const s = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
                 const t = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
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
             graphApi.addEdge(currentRoomId, edge).catch(e => console.error("Mongo Add Edge Failed", e));
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
             graphApi.updateEdge(currentRoomId, edge).catch(e => console.error("Mongo Update Edge Failed", e));
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
             graphApi.deleteEdge(currentRoomId, id).catch(e => console.error("Mongo Delete Edge Failed", e));
        }

        if (isLiveMode) {
            deleteRemoteEdge(id);
            addToHistory('Delete Edge', `Removed connection`, { nodes, edges: newEdges, comments });
        } else {
            addToHistory('Delete Edge', `Removed connection`, { nodes, edges: newEdges, comments });
        }
    };

    const updateConfig = (newConfig: Partial<UserProfile>) => {
        // Save local state immediately
        setConfig(newConfig);
        localStorage.setItem('app_config', JSON.stringify(newConfig));
        
        // Sync User Preferences (Language, Theme, UI Colors) to User Profile State & DB
        updateUserProfile({
             language: newConfig.language,
             theme: newConfig.theme,
             componentBg: newConfig.componentBg,
             propertyText: newConfig.propertyText,
             canvasBg: newConfig.canvasBg
        });

        if (isAuthenticated) {
             authApi.updateProfile({ 
                 language: newConfig.language,
                 theme: newConfig.theme,
                 componentBg: newConfig.componentBg,
                 propertyText: newConfig.propertyText,
                 canvasBg: newConfig.canvasBg
             }).catch(e => console.error("User Prefs Sync Failed", e));
        }
        
        // Sync Project Config (Mainly CanvasBG if changed here?)
        // If we are in a room, valid Graph Settings should go to the project.
        if (currentRoomId && isLiveMode) {
             // Strictly Filter Project Config: Only canvasBg survives in Project DB
             // We do NOT send language/theme to the Project DB anymore.
             const projectConfigPayload: ProjectConfig = {
                canvasBg: newConfig.canvasBg 
             };
             
             graphApi.updateConfig(currentRoomId, projectConfigPayload)
                .catch(e => console.error("Config Sync Failed", e));
        }
    };

    const updateProjectBackground = async (color: string) => {
        // Optimistic Update
        setConfig(prev => ({ 
            ...prev,
            canvasBg: color 
        }));
        // Update User Profile state as well
        updateUserProfile({ canvasBg: color });
        
        if (currentRoomId && isLiveMode) {
            try {
                // This backend endpoint now updates BOTH Project and User canvasBg
                await graphApi.updateBackground(currentRoomId, color);
            } catch(e) {
                console.error("Backgound Sync Failed", e);
            }
        } else if (isAuthenticated) {
            // If local/no-room but logged in, save to User Profile directly
            authApi.updateProfile({ canvasBg: color })
                .catch(e => console.error("User CanvasBg Sync Failed", e));
        }
        
        // Also save to local storage as fallback/default for local
        if (!currentRoomId) {
             const newConf = { 
                 ...config, 
                 canvasBg: color
             };
             localStorage.setItem('app_config', JSON.stringify(newConf));
        }
    };

    const t = (key: string) => getTranslation((config.language as Language) || 'en', key);

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
            isUserVisible, toggleUserVisibility,
            userProfile, updateUserProfile, userId, mySocketId,
            sessionConflict, resolveSessionConflict,
            sessionKicked, acknowledgeSessionKicked,
            tabId
        }}>
            {children}
        </GraphContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGraph = () => {
    const context = useContext(GraphContext);
    if (context === undefined) {
        throw new Error('useGraph must be used within a GraphProvider');
    }
    return context;
};
