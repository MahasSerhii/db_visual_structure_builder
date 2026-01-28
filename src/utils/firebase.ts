import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove, get, Database, onDisconnect, serverTimestamp } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, Auth, UserCredential } from 'firebase/auth';
import { NodeData, EdgeData, User } from './types';

let app: FirebaseApp | undefined;
let db: Database | undefined;
let auth: Auth | undefined;
let currentRoomId: string | null = null;
let currentUserId: string | null = null;
let isSyncEnabled: boolean = false;

export const setSyncEnabled = (enabled: boolean) => {
    isSyncEnabled = enabled;
};

export const initFirebase = (config: any) => {
    try {
        if (getApps().length) {
            // Force reset existing app to allow config updates (e.g. changing region)
            const existingApp = getApp();
            deleteApp(existingApp).catch(err => console.warn("Failed to delete existing app", err));
        }
        
        app = initializeApp(config);
        db = getDatabase(app);
        auth = getAuth(app);
        return true;
    } catch (e) {
        console.error("Firebase Init Error", e);
        return false;
    }
};

export const isFirebaseInitialized = () => {
    return !!auth;
};

export const signInWithGoogle = async (): Promise<UserCredential> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
};

export const signInWithApple = async (): Promise<UserCredential> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return await signInWithPopup(auth, provider);
};

export const connectToRoom = async (roomId: string, user: User, onDataChange: (data: any) => void): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    currentRoomId = roomId;
    currentUserId = user.id;

    // Verify connection established BEFORE assuming we can write
    // This catches "Region Mismatch" and "Permission Denied" (if .info/connected is restricted, though rare)
    // and "Invalid URL" errors that don't throw in initializeApp
    try {
        const connectedRef = ref(db, ".info/connected");
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Firebase Connection Timeout: Check URL, Region, or Network."));
            }, 5000); 

            const unsub = onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    clearTimeout(timeout);
                    // Ensure unsub exists before calling (just in case)
                    if(typeof unsub === 'function') unsub();
                    resolve();
                }
            }, (error) => {
                // If the listener itself fails (rare for .info/connected but possible)
                clearTimeout(timeout);
                reject(new Error(`Firebase Info Error: ${error.message}`));
            });
        });
    } catch(e: any) {
        throw new Error(`Connection Verification Failed: ${e.message}`);
    }

    // Register User logic - guarded by isSyncEnabled
    if (isSyncEnabled) {
        const userRef = ref(db, `graphs/${roomId}/users/${user.id.replace(/\./g, '_')}`); 
        
        try {
            const presencePromise = set(userRef, {
                name: user.name,
                color: user.color,
                lastActive: serverTimestamp(),
                cursor: { x: 0, y: 0 },
                role: user.role || 'guest',
                visible: user.visible ?? true
            });
            
            const failureTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Presence Timeout")), 3000));
            await Promise.race([presencePromise, failureTimeout]);
        } catch (e: any) {
            if (e.message !== "Presence Timeout") {
                 console.warn("Presence set failed (likely Read-Only):", e);
            } else {
                 console.log("Presence set timed out (but connection verified)");
            }
        }
        
        // Set Disconnect Clean up - Only if we are visible
        onDisconnect(userRef).remove().catch(() => {});
    } else {
        console.log("Connecting in Local/Silent Mode (No Presence Write)");
    }

    // Listen to graph changes
    const graphRef = ref(db, `graphs/${roomId}/data`);
    onValue(graphRef, (snapshot) => {
        const data = snapshot.val();
        onDataChange(data);
    }, (error) => {
        console.error("Firebase Read Error:", error);
    });
    
    // Resolve immediately to allow UI to unblock
    return Promise.resolve();
};

export const subscribeToUsers = (roomId: string, onUsersChange: (users: any) => void) => {
    if (!db) return;
    const usersRef = ref(db, `graphs/${roomId}/users`);
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        // Call callback even if data is null (empty list), pass empty object or null
        onUsersChange(data || {}); 
    });
};

export const updateUserPresence = (name: string, color: string) => {
    if (!db || !currentRoomId || !currentUserId || !isSyncEnabled) return;
    const userRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId.replace(/\./g, '_')}`);
    update(userRef, { name, color }).catch(e => console.error("Update Presence Failed", e));
};

export const updateRemoteCursor = (x: number, y: number) => {
    if (!db || !currentRoomId || !currentUserId || !isSyncEnabled) return;
    const cursorRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId}/cursor`);
    // Basic throttling could be added here
    set(cursorRef, { x, y });
};

export const syncNodeChange = (node: NodeData) => {
     if (!db || !currentRoomId || !isSyncEnabled) return;
     const nodeRef = ref(db, `graphs/${currentRoomId}/data/nodes/${node.id}`);
     // Sanitize undefined
     const cleanNode = JSON.parse(JSON.stringify(node));
     update(nodeRef, cleanNode);
};

export const syncEdgeChange = (edge: EdgeData) => {
    if (!db || !currentRoomId || !isSyncEnabled) return;
    const edgeRef = ref(db, `graphs/${currentRoomId}/data/edges/${edge.id}`);
    const cleanEdge = JSON.parse(JSON.stringify(edge));
    update(edgeRef, cleanEdge);
};

export const deleteRemoteNode = (nodeId: string) => {
    if (!db || !currentRoomId || !isSyncEnabled) return;
    const nodeRef = ref(db, `graphs/${currentRoomId}/data/nodes/${nodeId}`);
    remove(nodeRef);
};

export const deleteRemoteEdge = (edgeId: string) => {
    if (!db || !currentRoomId || !isSyncEnabled) return;
    const edgeRef = ref(db, `graphs/${currentRoomId}/data/edges/${edgeId}`);
    remove(edgeRef);
};

export const syncCommentChange = (comment: any) => {
    if (!db || !currentRoomId || !isSyncEnabled) return;
    const commentRef = ref(db, `graphs/${currentRoomId}/data/comments/${comment.id}`);
    const cleanComment = JSON.parse(JSON.stringify(comment));
    update(commentRef, cleanComment);
};

export const deleteRemoteComment = (commentId: string) => {
    if (!db || !currentRoomId || !isSyncEnabled) return;
    const commentRef = ref(db, `graphs/${currentRoomId}/data/comments/${commentId}`);
    remove(commentRef);
};

export const disconnectRoom = () => {
    if (db && currentRoomId && currentUserId) {
        // Must sanitize user ID just like in connectToRoom
        const userRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId.replace(/\./g, '_')}`);
        remove(userRef);
    }
    currentRoomId = null;
    isSyncEnabled = false; // Reset sync state
};

export const setPresence = (isOnline: boolean, user: { name: string; color: string; role?: 'host' | 'guest' | 'admin', visible?: boolean }) => {
    if (!db || !currentRoomId || !currentUserId) return;
    
    // Guard against setting presence ONLINE if sync is disabled (Local Mode)
    // We allow isOnline=false (remove) even if sync disabled, to clean up.
    if (isOnline && !isSyncEnabled) return;

    const userRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId.replace(/\./g, '_')}`);
    
    if (isOnline) {
        set(userRef, {
            name: user.name,
            color: user.color,
            lastActive: serverTimestamp(),
            cursor: { x: 0, y: 0 },
            role: user.role || 'guest',
            visible: user.visible !== undefined ? user.visible : true
        });
        onDisconnect(userRef).remove().catch(() => {});
    } else {
        remove(userRef);
        // We cancel onDisconnect (though remove() already deletes it, onDisconnect is stored on server)
        // onDisconnect(userRef).cancel() is the proper way if we want to retain data but mark offline,
        // but since we want to remove the user from the list, remove() is correct.
    }
};

export const uploadFullGraph = async (nodes: NodeData[], edges: EdgeData[], comments: any[]) => {
    if (!db || !currentRoomId) return;
    
    // Transform arrays to objects for Firebase key-value structure if needed, 
    // or just store as arrays/objects assuming Firebase handles it.
    // Our syncNodeChange updates individual paths. 
    // It's safer to reconstruct the object map to ensure ID keys match.
    
    const data: any = { nodes: {}, edges: {}, comments: {} };
    
    nodes.forEach(n => data.nodes[n.id] = n);
    edges.forEach(e => data.edges[e.id] = e);
    comments.forEach(c => data.comments[c.id] = c);
    
    const dataRef = ref(db, `graphs/${currentRoomId}/data`);
    await set(dataRef, data);
};

export const fetchRoomData = async (roomId: string): Promise<any> => {
    if (!db) return null;
    const dataRef = ref(db, `graphs/${roomId}/data`);
    
    // Quick checks using get() 
    try {
        // 3s Timeout to prevent UI lockup
        const snapshot = await get(dataRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (e) {
        console.warn("fetchRoomData failed (likely network):", e);
        throw e;
    }
};
