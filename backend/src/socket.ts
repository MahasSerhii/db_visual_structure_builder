import mongoose from 'mongoose';
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Session from './models/Session';
import Project from './models/Project';
import Access, { IAccess, IAccessUser } from './models/Access';
import User from './models/User';

let io: Server;

// Helper to get enriched sessions with Access info AND User info
const getEnrichedSessions = async (roomId: string) => {
    // 1. Get Active Socket Sessions
    const sessions = await Session.find({ roomId });
    
    try {
        const project = await Project.findOne({ roomId });
        const sessionUserIds = sessions.map(s => s.userId).filter(id => !!id);
        
        // 2. Fetch User Profiles (Name, Color)
        // Note: s.userId might be string in session, ensure matching types
        const users = await User.find({ _id: { $in: sessionUserIds } });
        
        // 3. Fetch Access Roles (One Access Doc per Project)
        let projectAccess: IAccess | null = null;
        if (project) {
            projectAccess = await Access.findOne({ projectId: project._id });
        }

        return sessions.map(s => {
            // Match Session -> User
            const user = users.find(u => s.userId && u._id.toString() === s.userId.toString());
            
            // Name/Color: Prefer User Profile if signed in, else Session Data (Guest)
            const name = user ? user.name : (s.userName || 'Guest'); 
            const color = user ? user.color : (s.userColor || '#ccc');
            
            // Determine Role
            let role = 'guest'; // Default
            if (project && project.ownerId && s.userId && project.ownerId.toString() === s.userId.toString()) {
                role = 'host';
            } else if (s.userId && projectAccess) {
                // Check if user is in access_granted list
                const accessUser = projectAccess.access_granted.find(u => u.userId.toString() === s.userId!.toString());
                if (accessUser) {
                    role = accessUser.role.toLowerCase(); 
                }
            }

            const isVisible = s.isVisible !== false;

            return {
                socketId: s.socketId,
                userId: s.userId, // Pass UserID to frontend for matching
                name,
                color,
                role, // Send Role to frontend
                isVisible 
            };
        });
    } catch (e) {
        console.error("Enrich Sessions Error", e);
        return sessions.map(s => ({ 
            socketId: s.socketId, 
            userId: s.userId,
            name: s.userName || 'Guest', 
            userColor: s.userColor || '#999', 
            isVisible: true,
            role: 'guest'
        }));
    }
};


export const initSocket = (httpServer: HttpServer, corsOrigin: string) => {
    // Clear all stale sessions on server restart
    // Since sockets are not persisted, any Session record at startup is invalid.
    Session.deleteMany({}).then(() => {
        console.log("Cleared stale sessions from DB");
    }).catch(e => console.error("Failed to clear sessions", e));

    io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('Client connected', socket.id);

        socket.on('join-room', async (data: { roomId: string, userName: string, userColor: string, userId?: string, isVisible?: boolean, userEmail?: string }) => {
            let { roomId, userId, userName, userColor, isVisible, userEmail } = data; 
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId}`);

            // Validate/Resolve User ID
            let resolvedUserId: mongoose.Types.ObjectId | undefined = undefined;
            
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                 resolvedUserId = new mongoose.Types.ObjectId(userId);
            } else if (userId) {
                 // Try looking up by email if provided or if userId looks like email
                 const emailToSearch = userEmail || (userId.includes('@') ? userId : null);
                 if (emailToSearch) {
                     try {
                        const user = await User.findOne({ email: emailToSearch });
                        if (user) {
                            resolvedUserId = user._id as mongoose.Types.ObjectId;
                        }
                     } catch(e) { console.error("User lookup failed", e); }
                 }
            }

            // Save Session
            try {
                // Eliminate duplicates by userId if present (optional logic)
                if (resolvedUserId) {
                     await Session.deleteMany({ roomId, userId: resolvedUserId, socketId: { $ne: socket.id } });
                }

                await Session.findOneAndUpdate(
                    { socketId: socket.id },
                    { 
                        socketId: socket.id, 
                        roomId, 
                        userId: resolvedUserId, // Now safely ObjectId or undefined
                        userName,
                        userColor,
                        connectedAt: new Date(),
                        isVisible: isVisible !== false
                    },
                    { upsert: true, new: true }
                );

                // Update Access: Set authorised = true on entry
                if (resolvedUserId) {
                     const project = await Project.findOne({ roomId });
                     if (project) {
                         const filter = { 
                                projectId: project._id, 
                                "access_granted.userId": resolvedUserId 
                            };
                         await Access.updateOne(
                            filter,
                            { $set: { "access_granted.$.authorised": true } }
                         );
                     }
                }

                // Broadcast active users
                const users = await getEnrichedSessions(roomId);
                io.to(roomId).emit('presence:update', users);
            } catch(e) { console.error("Session Save Error", e); }
        });

        socket.on('auth:logout', async () => {
            try {
                const session = await Session.findOne({ socketId: socket.id });
                if (session) {
                    if (session.userId) {
                        // Logged in user: Remove ALL sessions for this user across all tabs
                        const userSessions = await Session.find({ userId: session.userId });
                        const activeRooms = [...new Set(userSessions.map(s => s.roomId))];
                        
                        await Session.deleteMany({ userId: session.userId });
                        console.log(`User ${session.userId} logged out. Cleared ${userSessions.length} sessions.`);

                        // Update presence in all affected rooms
                        for (const rid of activeRooms) {
                            const users = await getEnrichedSessions(rid);
                            io.to(rid).emit('presence:update', users);
                        }
                    } else {
                        // Guest: Remove only this session
                        await Session.deleteOne({ socketId: socket.id });
                        const users = await getEnrichedSessions(session.roomId);
                        io.to(session.roomId).emit('presence:update', users);
                    }
                }
            } catch(e) { console.error("Logout Cleanup Error", e); }
        });

        socket.on('user:visibility', async (data: { roomId: string, isVisible: boolean }) => {
            const { roomId, isVisible } = data;
            try {
                const session = await Session.findOne({ socketId: socket.id });
                if (session && session.userId) {
                    const project = await Project.findOne({ roomId });
                    if (project) {
                         const filter: Record<string, any> = { 
                                projectId: project._id, 
                                "access_granted.userId": session.userId 
                            };
                         await Access.updateOne(
                            filter,
                            { $set: { "access_granted.$.visible": isVisible } }
                         );
                    }
                } else {
                    console.warn(`Cannot update visibility: No User ID for socket ${socket.id}`);
                }

                const users = await getEnrichedSessions(roomId);
                io.to(roomId).emit('presence:update', users);
            } catch(e) { console.error("Visibility Update Error", e); }
        });

        socket.on('leave-room', async (roomId: string) => {
            socket.leave(roomId);
            try {
                await Session.deleteOne({ socketId: socket.id });
                const users = await getEnrichedSessions(roomId);
                io.to(roomId).emit('presence:update', users);
            } catch (e) {
                console.error("Leave Room Error", e);
            }
        });
        
        socket.on('disconnect', async () => {
            console.log('Client disconnected', socket.id);
            try {
                const session = await Session.findOne({ socketId: socket.id });
                if (session) {
                    const { roomId } = session;
                    await Session.deleteOne({ socketId: socket.id });
                    const users = await getEnrichedSessions(roomId);
                    io.to(roomId).emit('presence:update', users);
                }
            } catch(e) {}
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
