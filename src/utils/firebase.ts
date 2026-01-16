import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove, Database, onDisconnect, serverTimestamp } from 'firebase/database';
import { NodeData, EdgeData, User } from './types';

let app: FirebaseApp | undefined;
let db: Database | undefined;
let currentRoomId: string | null = null;
let currentUserId: string | null = null;

export const initFirebase = (config: any) => {
    try {
        if (!getApps().length) {
            app = initializeApp(config);
        } else {
            app = getApp();
        }
        db = getDatabase(app);
        return true;
    } catch (e) {
        console.error("Firebase Init Error", e);
        return false;
    }
};

export const connectToRoom = (roomId: string, user: User, onDataChange: (data: any) => void) => {
    if (!db) return;
    currentRoomId = roomId;
    currentUserId = user.id;

    // Register User
    const userRef = ref(db, `graphs/${roomId}/users/${user.id}`);
    set(userRef, {
        name: user.name,
        color: user.color,
        lastActive: serverTimestamp(),
        cursor: { x: 0, y: 0 }
    });
    
    // Set Disconnect Clean up
    onDisconnect(userRef).remove();

    // Listen to graph changes
    const graphRef = ref(db, `graphs/${roomId}/data`);
    onValue(graphRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            onDataChange(data);
        }
    });
};

export const subscribeToUsers = (roomId: string, onUsersChange: (users: any) => void) => {
    if (!db) return;
    const usersRef = ref(db, `graphs/${roomId}/users`);
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) onUsersChange(data);
    });
};

export const updateRemoteCursor = (x: number, y: number) => {
    if (!db || !currentRoomId || !currentUserId) return;
    const cursorRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId}/cursor`);
    // Basic throttling could be added here
    set(cursorRef, { x, y });
};

export const syncNodeChange = (node: NodeData) => {
     if (!db || !currentRoomId) return;
     const nodeRef = ref(db, `graphs/${currentRoomId}/data/nodes/${node.id}`);
     // Sanitize undefined
     const cleanNode = JSON.parse(JSON.stringify(node));
     update(nodeRef, cleanNode);
};

export const syncEdgeChange = (edge: EdgeData) => {
    if (!db || !currentRoomId) return;
    const edgeRef = ref(db, `graphs/${currentRoomId}/data/edges/${edge.id}`);
    const cleanEdge = JSON.parse(JSON.stringify(edge));
    update(edgeRef, cleanEdge);
};

export const deleteRemoteNode = (nodeId: string) => {
    if (!db || !currentRoomId) return;
    const nodeRef = ref(db, `graphs/${currentRoomId}/data/nodes/${nodeId}`);
    remove(nodeRef);
};

export const deleteRemoteEdge = (edgeId: string) => {
    if (!db || !currentRoomId) return;
    const edgeRef = ref(db, `graphs/${currentRoomId}/data/edges/${edgeId}`);
    remove(edgeRef);
};

export const syncCommentChange = (comment: any) => {
    if (!db || !currentRoomId) return;
    const commentRef = ref(db, `graphs/${currentRoomId}/data/comments/${comment.id}`);
    const cleanComment = JSON.parse(JSON.stringify(comment));
    update(commentRef, cleanComment);
};

export const deleteRemoteComment = (commentId: string) => {
    if (!db || !currentRoomId) return;
    const commentRef = ref(db, `graphs/${currentRoomId}/data/comments/${commentId}`);
    remove(commentRef);
};

export const disconnectRoom = () => {
    if (db && currentRoomId && currentUserId) {
        const userRef = ref(db, `graphs/${currentRoomId}/users/${currentUserId}`);
        remove(userRef);
    }
    currentRoomId = null;
};
