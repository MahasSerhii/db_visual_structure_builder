import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session } from '../schema/session.schema';
import { Project } from '../schema/project.schema';
import { Access } from '../schema/access.schema';
import { User } from '../schema/user.schema';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust in production
  },
})
export class GraphGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GraphGateway');

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Access.name) private accessModel: Model<Access>,
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway Initialized');
    // Clear stale sessions
    this.sessionModel.deleteMany({}).then(() => {
        this.logger.log('Cleared stale sessions');
    });
  }

  async handleConnection(client: Socket) {
    // We could authenticate here, but typically we do it in join-room payload or headers
    // For now, just log
    // console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const session = await this.sessionModel.findOneAndDelete({ socketId: client.id });
    if (session) {
      await this.broadcastUserList(session.projectId);
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; token?: string; guestName?: string; guestColor?: string },
  ) {
    const { projectId, token, guestName, guestColor } = payload;
    
    let userId = null;
    let userName = guestName || 'Guest';
    let userColor = guestColor || '#ccc';

    // Verify token if present
    if (token) {
        try {
            const decoded = this.jwtService.verify(token);
            userId = decoded.sub; // sub is userId in our JWT strategy
            const user = await this.userModel.findById(userId);
            if (user) {
                userName = user.name;
                userColor = user.color;
            }
        } catch (e) {
            // Verify failed, treat as guest
        }
    }

    // Create session
    await this.sessionModel.create({
        socketId: client.id,
        projectId,
        userId,
        userName,
        userColor,
        isVisible: true
    });

    client.join(projectId);

    // Broadcast updated user list
    await this.broadcastUserList(projectId);
    
    // Notify client
    client.emit('room-joined', { projectId, userId });
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
     const session = await this.sessionModel.findOneAndDelete({ socketId: client.id });
     if(session) {
         client.leave(session.projectId);
         await this.broadcastUserList(session.projectId);
     }
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const projectId = Array.from(client.rooms.values())[1]; // [0] is socketId usually
    if (projectId) {
        client.to(projectId).emit('cursor-move', { ...payload, socketId: client.id });
    }
  }

  @SubscribeMessage('selection-change')
  handleSelectionChange(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const projectId = Array.from(client.rooms.values())[1];
    if (projectId) {
        client.to(projectId).emit('selection-change', { ...payload, socketId: client.id });
    }
  }
  
  @SubscribeMessage('viewport-change')
  handleViewportChange(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    // Usually we don't broadcast viewport unless following mode
  }

  // --- Helpers ---

  private async broadcastUserList(projectId: string) {
      const sessions = await this.sessionModel.find({ projectId });
      const enriched = await this.enrichSessions(sessions, projectId);
      this.server.to(projectId).emit('presence:update', enriched);
  }

  private async enrichSessions(sessions: any[], projectId: string) {
       // Fetch Project & Access for role determination
       const project = await this.projectModel.findById(projectId);
       const access = await this.accessModel.findOne({ projectId });
       
       return sessions.map(s => {
           let role = 'guest'; // default
           
           if (project && s.userId && project.ownerId?.toString() === s.userId?.toString()) {
               role = 'host';
           } else if (s.userId && access) {
               const grant = access.access_granted.find(g => g.userId === s.userId);
               if (grant) role = grant.role;
           }

           return {
               socketId: s.socketId,
               userId: s.userId,
               name: s.userName,
               color: s.userColor,
               role,
               isVisible: s.isVisible
           };
       });
  }

  // --- Public Methods for Service Injection ---
  
  public emitGraphChange(projectId: string, event: string, data: any) {
      this.server.to(projectId).emit(event, data);
  }
}
