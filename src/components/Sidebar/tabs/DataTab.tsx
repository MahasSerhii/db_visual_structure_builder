import React, { useState, useEffect, useRef } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useToast } from '../../../context/ToastContext';
import { NodeData, EdgeData, Comment, AppSettings, RoomAccessUser } from '../../../utils/types';
// Firebase imports removed

import { CSVModal } from '../../Modals/CSVModal';
import { HistoryModal } from '../../Modals/HistoryModal';
import { AuthModal, AuthMode } from '../../Modals/AuthModal';
import { ConfirmationModal } from '../../Modals/ConfirmationModal';
import { SyncConflictModal } from '../../Modals/SyncConflictModal';
import { ClearGraphModal } from '../../Modals/ClearGraphModal';


import { dbOp } from '../../../utils/indexedDB';
// FirebaseConfigSection import removed

import { RoomConnectionSection } from './DataTabParts/RoomConnectionSection';
import { TeamInviteSection } from './DataTabParts/TeamInviteSection';
import { ActiveUsersList } from './DataTabParts/ActiveUsersList';
import { DataActionsSection } from './DataTabParts/DataActionsSection';
import { downloadJSON, processImportFile, wipeDatabase } from '../../../utils/dataTabUtils';
// import { uploadFullGraphToBackend, api } from '../../../utils/api';
import { graphApi } from '../../../api/graph';



const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/auth';

export const DataTab: React.FC = () => {
    const { 
        config, nodes, edges, comments, refreshData, isLiveMode, setLiveMode, setGraphData, 
        currentRoomId, setCurrentRoomId, isReadOnly, setReadOnly, t, isAuthenticated, login, logout, 
        activeUsers, connectionStatus, setTransitioningToLive, updateConfig, updateProjectBackground,
        isUserVisible, toggleUserVisibility, userProfile, userId: currentUserId, mySocketId
    } = useGraph();
    const { showToast } = useToast();
    // Initialize Local RoomID from Context if we are in Live Mode
    const [roomId, setRoomId] = useState(() => {
        if (isLiveMode && currentRoomId) return currentRoomId;
        return sessionStorage.getItem('room_id_session') || '';
    });

    // Always start disconnected on mount to ensure fresh socket connection on reload
    // BUT if we have a session room, start as 'Restoring' to hide the input
    const [isRestoringSession, setIsRestoringSession] = useState(() => !!sessionStorage.getItem('room_id_session'));
    const [isConnected, setIsConnected] = useState(false);
    
    const [isCSVModalOpen, setCSVModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [isClearGraphModalOpen, setClearGraphModalOpen] = useState(false);
    
    // Room Access Management
    const [roomAccessUsers, setRoomAccessUsers] = useState<RoomAccessUser[]>([]);
    const [isRemoveUserConfirmOpen, setIsRemoveUserConfirmOpen] = useState(false);
    const [isLeaveRoomConfirmOpen, setIsLeaveRoomConfirmOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<{ accessId: string; name: string } | null>(null);
    
    // connectedUsers removed - using Context
    const [isUsersListOpen, setIsUsersListOpen] = useState(false);
    
    // Auth Components
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [authModalState, setAuthModalState] = useState<AuthMode>('LOGIN');
    const [authModalEmail, setAuthModalEmail] = useState('');
    const [incomingInviteToken, setIncomingInviteToken] = useState('');
    const [resetToken, setResetToken] = useState('');

    // Initialize ClientMode derived from URL to prevent UI flicker
    // UPDATED: Now we treat "Client Mode" (Guest UI) as default ONLY if we are not the Host.
    // We update this state after role verification.
    const [isClientMode, setIsClientMode] = useState(() => {
        const p = new URLSearchParams(window.location.search);
        // Default to client mode if link parameters exist
        return (!!p.get('config') && !!p.get('room')) || !!p.get('token');
    });
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [linkAllowEdit, setLinkAllowEdit] = useState(true);
    const hasShownErrorToast = useRef(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // Sync Conflict State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [pendingRemoteData, setPendingRemoteData] = useState<{ nodes: NodeData[], edges: EdgeData[], comments: Comment[], config: AppSettings } | null>(null);

    // Auth State
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [loginEmail, setLoginEmail] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showLoginUI, setShowLoginUI] = useState(false);


    // Sync local connecting state with global connection status
    useEffect(() => {
        // If the global status is resolved (failed or connected), ensure we stop showing local loaders
        // This prevents the Sidebar loader from "hanging" if the GraphContext connection fails faster than 
        // local checks in toggleLiveMode/handleConnect.
        if (connectionStatus === 'failed' || connectionStatus === 'connected') {
             setIsConnecting(false);
             setTransitioningToLive(false);
        }
    }, [connectionStatus, setTransitioningToLive]);


    // Handle Link Auto-Connect & Token Ops
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // const configParam = params.get('config');
        const roomParam = params.get('room');
        const permParam = params.get('p');
        const tokenParam = params.get('token');
        const resetTokenParam = params.get('reset_token');

        // 0. RESET PASSWORD FLOW
        if (resetTokenParam) {
            setResetToken(resetTokenParam);
            setAuthModalState('RESET_PASSWORD');
            setAuthModalOpen(true);
            return;
        }
        const inviteToken = params.get('invite_token');

        // 1. INVITE FLOW (New Priority)
        if (inviteToken) {
            // Check if we are already logged in?
            const token = localStorage.getItem('auth_token');
            // If we have a token, we might still want to validate the invite to get the room ID
            // but we shouldn't show the Login modal if the email matches.
            
            setIncomingInviteToken(inviteToken);
            fetch(`${API_URL}/validate-invite?token=${inviteToken}`)
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                         // Pre-set context data 
                        if (data.roomId) {
                            setRoomId(data.roomId);
                            sessionStorage.setItem('room_id_session', data.roomId);
                        }
                        if (data.configStr) {
                             // Legacy configStr handling removed
                        }
                        if (data.permissions) {

                             setReadOnly(data.permissions === 'r');
                        }
                        setIsClientMode(true); // Default to True (Guest) until verified

                        // If already authenticated, skip modal
                        if (token) {
                            try {
                                const payload = JSON.parse(atob(token.split('.')[1]));
                                if (payload.email === data.email) {
                                    showToast("Invitation Accepted (Logged In)", "success");
                                    // Verify Role since we are accepting invitation 
                                    // (Actual verification happens in handleConnect, but we can preset mode here if we want)
                                    // But handleConnect will run after this returns.
                                    return;
                                }
                            } catch {
                                // Ignore invalid token
                            }
                        }

                        setAuthModalEmail(data.email);
                        setAuthModalState(data.isRegistered ? 'LOGIN' : 'REGISTER');
                        setAuthModalOpen(true); 
                    } else {
                        showToast(data.error || "Invalid Invite Link", "error");
                    }
                })
                .catch(() => showToast("Failed to validate invite", "error"));
            return; // Stop processing other params if processing invite
        }

        // 2. Token Handling (Legacy/Direct)
        if (tokenParam) {
            localStorage.setItem('auth_token', tokenParam);
            setAuthToken(tokenParam);
            // Clean URL? Maybe later to hide token
        }

        // 2. Client Initialization
        if (roomParam && !isConnected) {
            let targetRoomId = roomParam;

            // Decode Room
            try {
                const decodedRoom = atob(roomParam);
                if (/^[\x20-\x7E]+$/.test(decodedRoom)) targetRoomId = decodedRoom;
            } catch { targetRoomId = roomParam; }

            setIsClientMode(true); 
            setRoomId(targetRoomId);

            if (permParam === 'r') setReadOnly(true);
        }
    }, [isConnected, setIsClientMode, setReadOnly, showToast]); 


    // Auto-Connect Effect
    useEffect(() => {
        // Debounce slightly to ensure firebase/room state is settled
        const timer = setTimeout(() => {
            if(roomId && !isConnected && !isConnecting) {
                 const storedSessionRoom = sessionStorage.getItem('room_id_session');
                 const shouldAutoConnect = isClientMode || (storedSessionRoom && storedSessionRoom === roomId);

                 if (shouldAutoConnect) {
                     const pref = sessionStorage.getItem('preferred_mode');
                     console.log(`Auto-connecting to ${roomId}. Target: ${pref || 'live'}`);
                     
                     // If preference is explicitly local, do NOT auto-connect to live
                     // Just restore session in Local Mode
                     if (pref === 'local') {
                         handleConnect(false);
                     } else {
                         // Default to live if no pref or pref is 'live'
                         handleConnect(true);
                     }
                 } else {
                     setIsRestoringSession(false);
                 }
            } else if (!roomId) {
                setIsRestoringSession(false);
            }
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, isClientMode, isConnected, isConnecting]);




    // Connection Toast Feedback Logic (Separated from realtime callback)
    useEffect(() => {
        if (isConnected) {
             if (!hasShownErrorToast.current) {
                 if (isLiveMode) {
                     showToast("Connected to Live Room!", 'success');
                 } else {
                     showToast("Restored Session (Local Mode)", 'info');
                 }
                 hasShownErrorToast.current = true;
             }
        }
    }, [isConnected, isLiveMode, showToast]);

    const toggleInvisible = () => {
        toggleUserVisibility();
        // Feedback
        if (!isUserVisible) showToast("You are now visible", "success");
        else showToast("You are now invisible", "info");
    };

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteEmail.includes('@')) {
            showToast("Invalid Email", "error");
            return;
        }
        setIsInviting(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                 showToast("You must be logged in to invite users", "error");
                 return;
            }

            const res = await fetch(`${API_URL}/invite`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    roomId,
                    configStr: '', // Legacy/Removed
                    origin: window.location.origin + window.location.pathname,
                    permissions: linkAllowEdit ? 'rw' : 'r',
                    hostName: userProfile.name,
                    projectName: 'Visual DB Project' // We could add a project name field
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Invite failed");
            }

            showToast("Invitation Sent!", "success");
            setInviteEmail('');
            // Refresh access list to show the new pending user
            fetchRoomAccessUsers();
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            showToast(msg || "Failed to send invite", "error");
        } finally {
            setIsInviting(false);
        }
    };

    const handleLoginRequest = async () => {
        if (!loginEmail || !loginEmail.includes('@')) {
            showToast("Enter a valid email", "error");
            return;
        }
        setIsLoggingIn(true);
        try {
            await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginEmail,
                    origin: window.location.origin + window.location.pathname
                })
            });
            showToast("Check your email for the login link", "info");
        } catch {
            showToast("Login request failed. Are you invited?", "error");
        } finally {
            setIsLoggingIn(false);
        }
    };

    // const handleLogout = async () => {
    //    await handleDisconnect();
    //    logout();
    // };

    // ... (rest of the file hooks)

    const syncProjectWithBackend = async (targetRoomId: string, role?: string) => {
        if (!authToken) return;
        try {
            let email = '';
            try { 
                const part = authToken.split('.')[1];
                if(part) email = JSON.parse(atob(part)).email; 
            } catch { /* ignore */ }
            
            if(!email) return;

            // Best effort save to backend
            await graphApi.saveProject({
                email,
                project: {
                    id: targetRoomId,
                    name: `Project ${targetRoomId.substring(0,6)}`,
                    configStr: '', // Legacy
                    author: userProfile.name,
                    url: window.location.origin + window.location.pathname,
                    role: role || (isClientMode ? 'guest' : 'host') // Explicitly send role
                }
            });
        } catch(e: unknown) { console.warn("Backend Sync Failed", e); }
    };


    // handleInitFirebase removed


    const handleConnect = async (forceLiveMode: boolean = true, tokenOverride?: string) => {
        if (!roomId) {
            showToast("Room ID is missing", "error");
            setIsRestoringSession(false);
            return;
        }

        // 1. AUTH CHECK
        const currentToken = tokenOverride || authToken || localStorage.getItem('auth_token');
        if (!currentToken && forceLiveMode) {
             showToast("Authentication Required for Live Sync", "warning");
             setShowLoginUI(true);
             setIsConnecting(false);
             setIsRestoringSession(false);
             return;
        }

        if (isConnecting) return; 

        // If already connected, just ensure the mode matches if connected via other means
        // This prevents double-connection logic or ghost toasts.
        // BUT if we are restoring a session, we want to verify the connection.
        if (isConnected && !isRestoringSession) {
            console.log("Already connected. Updating mode only.");
            if (forceLiveMode !== isLiveMode) {
                toggleLiveMode(forceLiveMode);
            }
            return;
        }

        // Force boolean
        const isLive = forceLiveMode === true;
        
        // FAST RESTORE FOR LOCAL MODE
        // If we are restoring a session and target mode is LOCAL, we skip network checks
        if (!isLive && isRestoringSession) {
             console.log("Restoring Local Session (Fast Path)");
             setCurrentRoomId(roomId); 
             setLiveMode(false);
             setIsConnected(true);
             setIsRestoringSession(false);
             setIsConnecting(false);
             return;
        }

        // Transition from RESTORING -> CONNECTING immediately
        // This stops "Restoring..." UI and shows "Connecting..." UI (spinner)
        setIsRestoringSession(false);
        setIsConnecting(true);
        console.log(`Checking connection... Target Mode: ${isLive ? 'LIVE' : 'LOCAL'}`);

        // Identity Management for Host vs Client (Guest)
        let userId = isClientMode 
            ? sessionStorage.getItem('client_uid') 
            : localStorage.getItem('my_user_id');

        let authEmail = null;
        const effectiveToken = tokenOverride || authToken || localStorage.getItem('auth_token');

        try {
            if (effectiveToken) {
                 const p = JSON.parse(atob(effectiveToken.split('.')[1]));
                 authEmail = p.email;
            }
        } catch { /* ignore */ }
        
        if (authEmail) {
            userId = authEmail;
            // Sync Auth ID to storage to ensure UI matching
            if(userId){
            localStorage.setItem('my_user_id', userId);
            if (isClientMode) sessionStorage.setItem('client_uid', userId)}
        } else if (!userId) {
            userId = (isClientMode ? 'guest_' : 'user_') + Math.random().toString(36).substr(2, 9);
            if (isClientMode) sessionStorage.setItem('client_uid', userId);
            else localStorage.setItem('my_user_id', userId);
        }

        // Determine Identity & Role
        let role: 'host' | 'guest' = isClientMode ? 'guest' : 'host'; // Default

        // Verify Access & Role from Backend
        if (effectiveToken && roomId) {
            try {
                // We should ideally await this, but handleConnect is already async.
                const verification = await graphApi.verifyAccess({ token: effectiveToken, roomId });
                
                if (verification.allowed) {
                    role = (verification.role as 'host' | 'guest') || role; // 'host' or 'guest' from DB
                    // Correctly update UI Mode
                    if (role === 'host') {
                         setIsClientMode(false); 
                    } else {
                         setIsClientMode(true);
                    }
                    console.log(`Verified Access. Role: ${role}. Client Mode: ${role !== 'host'}`);
                } else if (verification.code === 'NO_ACCESS') {
                    // User doesn't have access to this room
                    setIsConnecting(false);
                    showToast(verification.error || "You don't have access to this room", "error");
                    return;
                }
            } catch(e) { console.warn("Role verification failed", e); }
        }
        
        // 404 Check / Create Project
        try {
            // Check Room Existence (Just peek)
            await graphApi.getGraph(roomId); 
        } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            // Check if it's an access denied error
            if (msg && (msg.includes('403') || msg.includes('NO_ACCESS'))) {
                setIsConnecting(false);
                showToast("You don't have access to this room. Please contact the author.", "error");
                return;
            }
            
            if (msg && (msg.includes('404') || msg.includes('Project not found') || msg.includes('Cannot GET'))) {
                console.log("Room not found, creating new room:", roomId);
                try {
                    await graphApi.initGraph({ 
                        roomId, 
                        name: `Project ${roomId}`,
                        config: config
                    });
                    showToast("New Project Room Created!", "success");
                } catch {
                    setIsConnecting(false);
                    showToast("Failed to initialize room", "error");
                    return;
                }
            } else {
                // Network Error? Allow GraphContext to retry.
                console.warn("Pre-check failed, relying on context retry:", fetchErr);
            }
        }

        /* const userObj = {
            id: userId!, 
            name: displayName ,
            color: userProfile.color,
            lastActive: Date.now(),
            role: role,
            visible: isUserVisible
        }; */

        // Update Context to trigger Socket Connection & Data Loading
        setCurrentRoomId(roomId);
        setLiveMode(isLive);

        // Mark as Connected (Data will load via Context)
        setIsConnected(true); 
        sessionStorage.setItem('room_id_session', roomId);
        sessionStorage.setItem('preferred_mode', isLive ? 'live' : 'local');
        setIsRestoringSession(false); 

        // Sync with Backend (Fire and Forget)
        syncProjectWithBackend(roomId, role);

        // Clean Invite Token from URL if present
        const url = new URL(window.location.href);
        if (url.searchParams.has('invite_token')) {
            url.searchParams.delete('invite_token');
            window.history.replaceState({}, document.title, url.toString());
            setIncomingInviteToken(''); 
        }
    
        setIsConnecting(false);
    };



    // Need to handle graph updates from inside the callback.
    // The previous edit didn't include setGraphData in destructuring.
    // I will fix destructuring in next tool call.

    const handleDisconnect = async () => {
        // Prevent auto-reconnect loops to ensure we stay disconnected
        sessionStorage.removeItem('room_id_session');
        
        // Reset toast guard so we get feedback on next connect
        hasShownErrorToast.current = false;
        
        // 2. UI State Reset
        setIsClientMode(false); // Force exit client/auto mode
        setIsConnected(false);
        setLiveMode(false); 
        setRoomId(''); // Crucial: Clear Room ID state
        setLastSyncTime(null);
        setCurrentRoomId(null);
        // Note: We do NOT clear authToken here anymore, so user stays logged in
        
        // 3. Storage Cleanup

        // Wipe IndexedDB ONLY if we were a Guest (Client Mode)

        // If we were hosting (Local Mode synced to Live), we keep the data locally.
        if (isClientMode) {
            await wipeDatabase();
            
            try { await refreshData(); } catch { /* ignore */ }

             localStorage.clear();
             // Clean Redirect to remove query params to prevent auto-client-mode re-entry
             window.location.href = window.location.origin + window.location.pathname;
        } else {
             showToast("Disconnected. Local data preserved.", "info");
        }
    };
    
    // Wrapper for Button Click
    const onDisconnectClick = () => {
        setIsDisconnectModalOpen(true);
    };

    const handleDeleteDB = () => {
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteDB = async () => {
         setIsDeleteConfirmOpen(false);

         // If connected to a room, try to delete it remotely
         if (isConnected && roomId && !isClientMode) {
             try {
                 await graphApi.deleteGraph(roomId);
                 showToast("Remote Project Deleted", "success");
             } catch (e) {
                 console.error("Delete Failed", e);
                 // Proceed to local wipe anyway
             }
         }

         // Wipe Local & Disconnect
             await wipeDatabase();
             refreshData();
             handleDisconnect();
             showToast("Database & Local Data Wiped", "info");
    };

    const handleCopyMagicLink = async () => {
        if (!roomId) {
            showToast("Init Room ID first", "error");
            return;
        }

        // Require email to generate link
        if (!inviteEmail) {
             showToast("Please enter an email to generate a secure link", "warning");
             return;
        }

        if (!inviteEmail.includes('@')) {
             showToast("Please enter a valid email address", "warning");
             return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                    showToast("You must be logged in to generate invite links", "error");
                    return;
            }
            
            showToast("Generating secure link...", "info");
            
            const res = await fetch(`${API_URL}/invite`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    roomId,
                    configStr: '',
                    origin: window.location.origin + window.location.pathname,
                    permissions: linkAllowEdit ? 'rw' : 'r',
                    hostName: userProfile.name,
                    projectName: 'Visual DB Project',
                    skipEmail: true // Don't send email, just return link
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to generate link");
            }

            const data = await res.json();
            if (data.link) {
                navigator.clipboard.writeText(data.link);
                showToast(`Secure Link for ${inviteEmail} copied!`, "success");
                setInviteEmail('');
                fetchRoomAccessUsers();
            } else {
                throw new Error("No link returned from server");
            }
        } catch (e) {
                console.error(e);
                showToast(e instanceof Error ? e.message : String(e), "error");
        }
    };

    const toggleLiveMode = async (targetMode: boolean) => {
        if (!isConnected) {
             showToast("Connect to a room first", "error");
             return;
        }

        if (isConnecting) return;

        // Allow force-reset if clicking same mode
        // But ALLOW retry if we are 'Live' but failed status
        if (targetMode === isLiveMode && connectionStatus !== 'failed') {
             console.log("Already in target mode", targetMode);
             return;
        }
        
        // Persist preference
        sessionStorage.setItem('preferred_mode', targetMode ? 'live' : 'local');

        if (targetMode) {
             // Switching TO Live Mode
             setIsConnecting(true);
             
             // Only show global blocking loader if this is the FIRST connect or a different kind of transition
             // If we are just retrying, we might want to stay non-blocking?
             // But actually, for collision check we need to wait.
             // However, if we fail, we want user to be able to click Local.
             setTransitioningToLive(true);
             
             // FORCE SOCKET RE-INIT if we are actively retrying a failed connection
             if (isLiveMode && connectionStatus === 'failed') {
                 // Trigger refresh logic which handles socket re-attempts in GraphContext
                 // We don't have direct socket access here but we can use our 'refreshData'
                 // However, 'refreshData' does a GET request first. 
                 // So actually just proceeding to conflict check (api.get) is the right path.
                 // If api.get succeeds, we assume network is up and we proceed.
             }

             try {
                 // Fetch data manually to check for conflicts (Cache-busted)
                 const data = await graphApi.getGraph(`${roomId}?t=${Date.now()}`);
                 
                 const rNodes = data?.nodes || [];
                 const rEdges = data?.edges || [];
                 const rComments = data?.comments || [];
                 
                 // Construct minimal config from remote project settings
                 const rConfig = data.project?.config || {} as AppSettings;

                 // Normalization for comparison: Sort by ID and remove metadata + normalize nulls
                 const clean = (arr: Array<NodeData | EdgeData>) => arr.map(item => {
                     const { id, x, y, title, description, color, props, source, target } = item as Partial<NodeData & EdgeData>;
                     return {
                         id: id!, 
                         x, 
                         y, 
                         // Normalize null/undefined to consistent undefined so JSON.stringify drops them
                         title: title || undefined,
                         description: description || undefined,
                         color: color || undefined,
                         props, 
                         source, 
                         target
                     };
                 }).sort((a, b) => a.id.localeCompare(b.id));

                 const localNodesClean = clean(nodes);
                 const remoteNodesClean = clean(rNodes);
                 
                 // Config comparison
                 const cleanLocalConfig = { backgroundColor: config.defaultColors?.canvasBg };
                 const cleanRemoteConfig = { backgroundColor: rConfig.defaultColors?.canvasBg };
                 
                 const hasConfigDiff = JSON.stringify(cleanLocalConfig) !== JSON.stringify(cleanRemoteConfig);
                 const hasNodeDiff = JSON.stringify(localNodesClean) !== JSON.stringify(remoteNodesClean);
                 const hasEdgeDiff = JSON.stringify(clean(edges)) !== JSON.stringify(clean(rEdges));

                 const isRemoteEmpty = rNodes.length === 0 && rEdges.length === 0;
                 
                 // Explicit count check to catch simple deletions/additions even if content looks similar (edge case)
                 const countDiff = (nodes.length !== rNodes.length) || (edges.length !== rEdges.length);

                 // Conflict Logic:
                 const hasConflict = !isRemoteEmpty && (countDiff || hasNodeDiff || hasEdgeDiff || hasConfigDiff);
                 
                 console.log("[Sync Check]", { 
                     hasConflict, isRemoteEmpty, 
                     countDiff, hasNodeDiff, hasEdgeDiff, hasConfigDiff,
                     localCount: nodes.length, remoteCount: rNodes.length
                 });

                 if (hasConflict) {
                     setPendingRemoteData({ nodes: rNodes, edges: rEdges, comments: rComments, config: rConfig });
                     setIsSyncModalOpen(true);
                     // Stop here. Modal handles the rest.
                     setIsConnecting(false); 
                     return; 
                 } else {
                     // No conflict, safe to sync
                     // Push local config if we are "winning" or it's empty
                     await graphApi.syncGraph(roomId, { nodes, edges, comments, config }, true);
                     showToast("Live Sync Enabled", "success");
                     setLiveMode(true);
                 }
             } catch(e: unknown) {
                 console.error("Live Check Error", e);
                 const msg = e instanceof Error ? e.message : String(e);

                 // Fix: Don't enter live mode if Authorization is the issue
                 if (msg.includes('Unauthorized') || msg.includes('Invalid Token') || msg.includes('User not found') || msg.includes('jwt expired')) {
                      showToast("Authentication Failed. Please log in again.", "error");
                      // We could trigger logout here too, or let api failure do it?
                      // But better to stop flow here.
                      logout(); 
                      setIsConnecting(false);
                      setTransitioningToLive(false);
                      return;
                 }

                 // Fallback: Enable Live Mode even if check failed
                 // But keep status as failed if socket not connected
                 setLiveMode(true);
                 
                 // If api failed, we assume connection failed. 
                 // We don't need to push data blindly if API is down.
                 
                 if (nodes.length > 0 || edges.length > 0) {
                      // Attempt background push if possible? 
                      // or just warn
                      showToast("Connection Failed. Retrying in background...", "warning");
                 } else {
                     showToast("Live Sync Active (Empty)", "info");
                 }
             } finally {
                 // ONLY clear connecting if we didn't return early for modal
                 if (!isSyncModalOpen) {
                     setIsConnecting(false);
                     setTransitioningToLive(false);
                 }
             }
        } else {
             // Switching TO Local Mode
             console.log("Switching to Local Mode");
             setIsConnecting(false); // Force stop connecting state
             setTransitioningToLive(false); // Remove global loader if any
             setLiveMode(false);
             showToast("Switched to LOCAL Mode", "info");
        }
    };
    
    const resolveSync = async (action: 'push_local' | 'pull_remote' | 'merge', mergedData?: { nodes: NodeData[], edges: EdgeData[], comments: Comment[] }) => {
        setIsSyncModalOpen(false);
        setIsConnecting(true);
        setTransitioningToLive(true);
        
        try {
            if (action === 'push_local') {
                await graphApi.syncGraph(roomId, { nodes, edges, comments, config }, true);
                showToast("Local data pushed to Live Room", "success");
            } else if (action === 'merge' && mergedData) {
                 const { nodes: n, edges: e, comments: c } = mergedData;
                 
                 // 1. Update In-Memory State & Trigger IDB Sync via GraphContext
                 // We do NOT manually wipe/write here because setGraphData handles it cleanly.
                 setGraphData(n, e, c);
                 
                 // 2. Push to Backend (Source of Truth)
                 // Critical: Ensure backend is updated BEFORE we go live to prevent stale data pull
                 await graphApi.syncGraph(roomId, { nodes: n, edges: e, comments: c, config }, true);
                 
                 showToast("Merged data synced successfully", "success");

            } else {
                if (pendingRemoteData) {
                    const { nodes: n, edges: e, comments: c, config: cfg } = pendingRemoteData;
                    
                    // Update State & Local DB
                    setGraphData(n, e, c);
                    
                    // Update Config
                    if (cfg && cfg.defaultColors.canvasBg) {
                        updateProjectBackground(cfg.defaultColors.canvasBg);
                    }
                    if (cfg) {
                         // Merge other config if specific fields exist
                         // ignoring local pref like theme/language
                         updateConfig({ ...config, ...cfg, theme: config.theme, language: config.language });
                    }

                    showToast("Remote data loaded locally", "success");
                }
            }
            setLiveMode(true);
            setLastSyncTime(new Date());
        } catch {
            showToast("Sync failed", "error");
        } finally {
            setIsConnecting(false);
            setTransitioningToLive(false);
            setPendingRemoteData(null);
        }
    };

    const exportJSON = () => {
        downloadJSON(nodes, edges, comments);
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // PERMISSION CHECK using Backend Role
        // We rely on isClientMode which is now updated by backend role verification
        if (isClientMode) { // If still ClientMode (Guest), deny import
            showToast("You do not have permission to import data.", "error");
            return;
        }

        // LIVE MODE WARNING
        if (isLiveMode) {
             if (!confirm("⚠️ CAUTION: You are importing data while in LIVE Sync Mode.\n\nThis will OVERWRITE the REMOTE database for everyone.\n\nDo you want to continue?")) {
                 // Reset input so they can try again if they change their mind
                 event.target.value = '';
                 return;
             }
        } else {
             if (nodes.length > 0 && !confirm("This will overwrite your current graph data. Continue?")) {
                 event.target.value = '';
                 return;
             }
        }
        
        const file = event.target.files?.[0];
        if (!file) return;

        // Pass a no-op to processImportFile so it doesn't trigger a premature refresh from server
        // which would overwrite our just-imported local data before we can sync it up.
        const result = await processImportFile(file, async () => {});
        
        if (result.success) {
            // Auto-Push if Live Mode
            if (isLiveMode) {
                try {
                    // Read fresh data from DB because 'nodes' in closure is stale
                    const n = await dbOp('nodes', 'readonly', 'getAll') as NodeData[];
                    const e = await dbOp('edges', 'readonly', 'getAll') as EdgeData[];
                    const c = await dbOp('comments', 'readonly', 'getAll') as Comment[];
                    
                    if (n.length === 0 && e.length === 0) {
                        console.warn("Import warning: IDB returned empty arrays immediately after import.");
                        // Retry once if needed? Or maybe the file was empty.
                    }

                    await graphApi.syncGraph(roomId, { nodes: n, edges: e, comments: c }, true);
                    
                    // NOW refresh from server (which should contain the data we just pushed)
                    await refreshData(true);
                    
                    showToast("Imported & Synced to Live Room", "success");
                } catch(err: unknown) {
                    console.error("Import Sync Failed", err);
                    showToast("Imported locally but failed to sync remote", "warning");
                    // Ensure we at least see the local data
                    await refreshData(false);
                }
            } else {
                // Local Mode: just refresh from the local DB we just wrote to
                await refreshData(true);
                alert(result.message);
            }
        } else {
            alert(result.message);
        }
    };

    const handleClearGraph = async (clearLocal: boolean, clearLive: boolean) => {
        try {
            if (clearLocal) {
                // Clear from IndexedDB
                await dbOp('nodes', 'readwrite', 'clear');
                await dbOp('edges', 'readwrite', 'clear');
                await dbOp('comments', 'readwrite', 'clear');
                
                // Update context with empty data
                setGraphData([], [], []);
            }

            if (clearLive && isLiveMode && currentRoomId) {
                // Clear from backend (live room)
                try {
                    await graphApi.clearRoom(currentRoomId);

                    // Refresh data from backend to reflect the clearing
                    await refreshData(true);
                    showToast("Graph cleared successfully", "success");
                } catch (err) {
                    console.error("Failed to clear live graph", err);
                    showToast("Failed to clear live graph", "error");
                }
            } else if (clearLocal) {
                // If only clearing local, show confirmation
                showToast("Local graph cleared successfully", "success");
            }
        } catch (err) {
            console.error("Error clearing graph", err);
            showToast("Failed to clear graph", "error");
        }
    };

    // Fetch room access users (only for project author)
    const fetchRoomAccessUsers = React.useCallback(async () => {
        if (!isLiveMode || !currentRoomId || isClientMode) return;

        try {
            const data = await graphApi.getAccess(currentRoomId);
            setRoomAccessUsers(data.users || []);
        } catch (err) {
            console.error("Failed to fetch room access users", err);
        }
    }, [isLiveMode, currentRoomId, isClientMode]);

    // Handle removing user from room
    const handleRemoveUserFromRoom = async (accessId: string, userName: string) => {
        setUserToRemove({ accessId, name: userName });
        setIsRemoveUserConfirmOpen(true);
    };

    // Confirm and execute user removal
    const confirmRemoveUser = async () => {
        if (!userToRemove || !currentRoomId) return;

        try {
            await graphApi.removeAccess(currentRoomId, userToRemove.accessId);
            showToast(`${userToRemove.name} has been removed from the project`, "success");
            // Refresh the access list
            await fetchRoomAccessUsers();
        } catch (err) {
            console.error("Error removing user", err);
            showToast("Failed to remove user from project", "error");
        } finally {
            setIsRemoveUserConfirmOpen(false);
            setUserToRemove(null);
        }
    };

    const handleLeaveRoom = (accessId: string, userName: string) => {
        setUserToRemove({ accessId, name: userName });
        setIsLeaveRoomConfirmOpen(true);
    };

    const confirmLeaveRoom = async () => {
        if (!userToRemove || !currentRoomId) return;

        try {
            await graphApi.removeAccess(currentRoomId, userToRemove.accessId);
            showToast("You have left the room", "success");
            handleDisconnect();
        } catch (err) {
            console.error("Error leaving room", err);
            showToast("Failed to leave room", "error");
        } finally {
            setIsLeaveRoomConfirmOpen(false);
            setUserToRemove(null);
        }
    };

    // Fetch room access users when connected to live mode
    useEffect(() => {
        if (isLiveMode && isConnected && currentRoomId && !isClientMode) {
            fetchRoomAccessUsers();
        }
    }, [isLiveMode, isConnected, currentRoomId, isClientMode, fetchRoomAccessUsers]);

    return (
        <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('data.collab')}</h3>
            
            <div className="p-4 bg-white rounded-lg border border-indigo-200 shadow-sm space-y-3 dark:bg-indigo-900/10 dark:border-indigo-800">
                 <div className="text-xs font-bold text-gray-700 flex justify-between items-center dark:text-indigo-200">
                     <span>{t('data.live')}</span>
                     <span 
                         className={`w-2 h-2 rounded-full ${
                             isConnected || (isLiveMode && connectionStatus === 'connected') 
                                 ? (isLiveMode 
                                     ? (connectionStatus === 'failed' ? 'bg-red-500' : 'bg-green-500') 
                                     : 'bg-orange-400') 
                                 : 'bg-gray-300'
                         }`} 
                         title={isConnected ? (isLiveMode ? (connectionStatus === 'failed' ? "Live Sync Failed" : "Live Sync Active") : "Local Mode (Paused)") : "Disconnected"}
                     ></span>
                 </div>

                     <>
                        <RoomConnectionSection
                            t={t}
                            isClientMode={isClientMode}
                            isConnected={isConnected}
                            isRestoringSession={isRestoringSession}
                            isLiveMode={isLiveMode}
                            roomId={roomId}
                            setRoomId={setRoomId}
                            handleDeleteDB={handleDeleteDB}
                            handleDisconnect={onDisconnectClick}
                            showLoginUI={showLoginUI}
                            loginEmail={loginEmail}
                            setLoginEmail={setLoginEmail}
                            handleLoginRequest={handleLoginRequest}
                            isLoggingIn={isLoggingIn}
                            isConnecting={isConnecting}
                            connectionStatus={connectionStatus}
                            handleConnect={handleConnect}
                            toggleLiveMode={toggleLiveMode}
                            lastSyncTime={lastSyncTime}
                            isAuthenticated={!!isAuthenticated}
                            onOpenAuthModal={() => setAuthModalOpen(true)}
                            />
                            
                        {!isClientMode && isConnected && <TeamInviteSection
                            t={t}
                            isClientMode={isClientMode}
                            isConnected={isConnected}
                            isRestoringSession={isRestoringSession}
                            linkAllowEdit={linkAllowEdit}
                            setLinkAllowEdit={setLinkAllowEdit}
                            inviteEmail={inviteEmail}
                            setInviteEmail={setInviteEmail}
                            handleInviteUser={handleInviteUser}
                            isInviting={isInviting}
                            handleCopyMagicLink={handleCopyMagicLink}
                        />}
                        

                        {isSyncModalOpen && <SyncConflictModal
                            isOpen={isSyncModalOpen}
                            onClose={() => { setIsSyncModalOpen(false); setPendingRemoteData(null); }}
                            localData={{ nodes, edges, comments, config }}
                            remoteData={pendingRemoteData || { nodes: [], edges: [], comments: [] }}
                            onResolve={resolveSync}
                        />}

                        <ActiveUsersList
                            t={t}
                            isConnected={isConnected}
                            connectedUsers={activeUsers}
                            isClientMode={isClientMode}
                            isUsersListOpen={isUsersListOpen}
                            setIsUsersListOpen={setIsUsersListOpen}
                            isLiveMode={isLiveMode}
                            isInvisible={!isUserVisible}
                            toggleInvisible={toggleInvisible}
                            userProfile={userProfile}
                            currentUserId={currentUserId}
                            mySocketId={mySocketId}
                            isProjectAuthor={!isClientMode && isLiveMode}
                            onRemoveUser={handleRemoveUserFromRoom}
                            onLeaveRoom={handleLeaveRoom}
                            roomAccessUsers={roomAccessUsers}
                        />
                     </>

            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('data.mgmt')}</h3>
            
            <DataActionsSection
                t={t}
                setCSVModalOpen={setCSVModalOpen}
                exportJSON={exportJSON}
                isReadOnly={isReadOnly}
                handleImportFile={handleImportFile}
                setHistoryModalOpen={setHistoryModalOpen}
                setClearGraphModalOpen={setClearGraphModalOpen}
            />
            
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setAuthModalOpen(false)} 
                initialState={authModalState}
                initialEmail={authModalEmail}
                inviteToken={incomingInviteToken}
                resetToken={resetToken}
                onSuccess={(token, email, name, projects, userProfile) => {
                    // Use Global Context Login to update 'isAuthenticated' state across the app
                    login(token, email, name, 'email', projects, userProfile); 
                    setAuthToken(token); // Update local state for immediate use
                    
                    setAuthModalOpen(false);
                    showToast("Authenticated Successfully", "success");
                    
                    // Always Reset Modal State for next use
                    setAuthModalState('LOGIN');

                    // Clean URL - clean up the reset token or invite token
                    const url = new URL(window.location.href);
                    if (url.searchParams.has('reset_token')) {
                        url.searchParams.delete('reset_token');
                        setResetToken('');
                        window.history.replaceState({}, document.title, url.toString());
                    }
                    if (url.searchParams.has('invite_token')) {
                         // We probably joined the room already via handleConnect automation or will do so
                         // But if we just logged in, we might want to keep it briefly? 
                         // No, Login/Register success handles the invite logic on backend mostly
                         // But the frontend `useEffect` for invite might want to run if we haven't connected yet.
                         // Let's leave invite_token for the other effect to clean up AFTER connection
                    }

                    // If login was standalone, maybe we want to auto-connect?
                    if (isClientMode) {
                        handleConnect(true, token); // Pass token explicitly for immediate connection
                    }
                }}
            />

            <ConfirmationModal 
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteDB}
                title="Delete Room & Data"
                message="DANGER: This action will permanently delete this Room/Project and all its contents (nodes, edges, comments). This cannot be undone."
                confirmText="Delete Room"
                isDanger={true}
            />
            
            <CSVModal isOpen={isCSVModalOpen} onClose={() => setCSVModalOpen(false)} />
            <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setHistoryModalOpen(false)} />

            <ClearGraphModal
                isOpen={isClearGraphModalOpen}
                onClose={() => setClearGraphModalOpen(false)}
                onConfirm={handleClearGraph}
                isLiveMode={isLiveMode}
                t={t}
            />

            <ConfirmationModal
                isOpen={isRemoveUserConfirmOpen}
                onClose={() => {
                    setIsRemoveUserConfirmOpen(false);
                    setUserToRemove(null);
                }}
                onConfirm={confirmRemoveUser}
                title={t('user.removeTitle')}
                message={`${t('user.removeMessage')} "${userToRemove?.name || ''}"?`}
                confirmText={t('user.removeConfirm')}
                cancelText={t('cancel')}
                isDanger={true}
            />

            <ConfirmationModal
                isOpen={isLeaveRoomConfirmOpen}
                onClose={() => {
                    setIsLeaveRoomConfirmOpen(false);
                    setUserToRemove(null);
                }}
                onConfirm={confirmLeaveRoom}
                title={t('Leave Room') || "Leave Room"}
                message={`${t('Are you sure you want to leave this room? You will lose access to this project.')}`}
                confirmText={t('Leave') || "Leave"}
                cancelText={t('cancel')}
                isDanger={true}
            />

            <ConfirmationModal
                isOpen={isDisconnectModalOpen}
                onClose={() => setIsDisconnectModalOpen(false)}
                onConfirm={() => {
                    handleDisconnect();
                    setIsDisconnectModalOpen(false);
                }}
                title={t('disconnect.title')}
                message={t('disconnect.message') + "\n\n" + t('disconnect.tip')}
                confirmText={t('disconnect.confirm')}
                cancelText={t('disconnect.cancel')}
                isDanger={true}
            />
        </div>
    );
};
