import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Session from './models/Session';

let io: Server;

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

        socket.on('join-room', async (data: { roomId: string, userName: string, userColor: string, userEmail?: string, isVisible?: boolean }) => {
            const { roomId, userName, userColor, userEmail, isVisible = true } = data;
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId}`);

            // Save Session
            try {
                // Remove existing sessions for this user in this room to prevent duplicates
                // This assumes one active session per user per room (fixes ghost sessions)
                if (userEmail && userEmail !== 'hidden') {
                    await Session.deleteMany({ roomId, userEmail, socketId: { $ne: socket.id } });
                }

                await Session.findOneAndUpdate(
                    { socketId: socket.id },
                    { socketId: socket.id, roomId, userName, userColor, userEmail, isVisible, connectedAt: new Date() },
                    { upsert: true }
                );

                // Broadcast active users
                const sessions = await Session.find({ roomId });
                io.to(roomId).emit('presence:update', sessions.map(s => ({
                    socketId: s.socketId,
                    name: s.userName,
                    color: s.userColor,
                    email: s.userEmail,
                    isVisible: s.isVisible
                })));
            } catch(e) { console.error("Session Save Error", e); }
        });

        socket.on('user:visibility', async (data: { roomId: string, isVisible: boolean }) => {
            const { roomId, isVisible } = data;
            try {
                await Session.findOneAndUpdate({ socketId: socket.id }, { isVisible });
                const sessions = await Session.find({ roomId });
                io.to(roomId).emit('presence:update', sessions.map(s => ({
                    socketId: s.socketId,
                    name: s.userName,
                    color: s.userColor,
                    email: s.userEmail,
                    isVisible: s.isVisible
                })));
            } catch(e) { console.error("Visibility Update Error", e); }
        });

        socket.on('leave-room', async (roomId: string) => {
            socket.leave(roomId);
            try {
                await Session.deleteOne({ socketId: socket.id });
                const sessions = await Session.find({ roomId });
                io.to(roomId).emit('presence:update', sessions.map(s => ({
                    socketId: s.socketId,
                    name: s.userName,
                    color: s.userColor,
                    email: s.userEmail,
                    isVisible: s.isVisible
                })));
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
                    const sessions = await Session.find({ roomId });
                    io.to(roomId).emit('presence:update', sessions.map(s => ({
                        socketId: s.socketId,
                        name: s.userName,
                        color: s.userColor,
                        email: s.userEmail,
                        isVisible: s.isVisible
                    })));
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
