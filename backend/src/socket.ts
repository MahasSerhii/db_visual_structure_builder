import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Session from './models/Session';
import Project from './models/Project';
import Access from './models/Access';
import User from './models/User';

let io: Server;

// Helper to get enriched sessions with Access info AND User info
const getEnrichedSessions = async (roomId: string) => {
    const sessions = await Session.find({ roomId });
    try {
        const project = await Project.findOne({ roomId });
        const userIds = sessions.map(s => s.userId).filter(id => !!id);
        
        // Fetch User details (name, color)
        const users = await User.find({ _id: { $in: userIds } });
        
        // Fetch Access details
        let accesses: any[] = [];
        if (project) {
            accesses = await Access.find({ projectId: project._id as any, isDeleted: false });
        }

        return sessions.map(s => {
            const user = users.find(u => s.userId && u._id.toString() === s.userId.toString());
            
            // Should valid user always exist? If not, fallback to Guest?
            // User requested to rely on User table.
            const name = user ? user.name : 'Guest'; 
            const color = user ? user.color : '#ccc';

            if (!project) return { 
                socketId: s.socketId, 
                userId: s.userId,
                name, 
                color, 
                isVisible: true 
            };

            // Find access record by userId
            const access = accesses.find(a => 
                a.userId && s.userId && a.userId.toString() === s.userId.toString()
            );
            
            // If access record exists, use its visibility. Otherwise default true.
            const isVisible = access ? access.isVisible : true;

            return {
                socketId: s.socketId,
                userId: s.userId,
                name,
                color,
                isVisible
            };
        });
    } catch (e) {
        console.error("Enrich Sessions Error", e);
        // Fallback if DB fetch fails
        return sessions.map(s => ({ 
            socketId: s.socketId, 
            userId: s.userId,
            name: 'Guest (Err)', 
            color: '#999', 
            isVisible: true 
        }));
    }
};

export const initSocket = (httpServer: HttpServer, corsOrigin: string) => {
    io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('Client connected', socket.id);

        socket.on('join-room', async (data: { roomId: string, userName: string, userColor: string, userId?: string }) => {
            const { roomId, userId } = data; // userName/Color ignored for storage, used from DB
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId} (User ID: ${userId})`);

            // Save Session
            try {
                // Eliminate duplicates by userId if present
                if (userId) {
                     await Session.deleteMany({ roomId, userId: userId as any, socketId: { $ne: socket.id } });
                }

                await Session.findOneAndUpdate(
                    { socketId: socket.id },
                    { 
                        socketId: socket.id, 
                        roomId, 
                        userId: userId as any, // Cast to any to satisfy TS but it will be ObjectId or null
                        connectedAt: new Date() 
                    },
                    { upsert: true }
                );

                // Broadcast active users
                const users = await getEnrichedSessions(roomId);
                io.to(roomId).emit('presence:update', users);
            } catch(e) { console.error("Session Save Error", e); }
        });

        socket.on('user:visibility', async (data: { roomId: string, isVisible: boolean }) => {
            const { roomId, isVisible } = data;
            try {
                // We need to find the Project and Access logic here
                const session = await Session.findOne({ socketId: socket.id });
                if (session && session.userId) {
                    const project = await Project.findOne({ roomId });
                    if (project) {
                         await Access.findOneAndUpdate(
                            { projectId: project._id as any, userId: session.userId as any },
                            { isVisible },
                            { new: true }
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
