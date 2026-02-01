import { Response } from 'express';
import Project from '../models/Project';
import Node from '../models/Node';
import Edge from '../models/Edge';
import Comment from '../models/Comment';
import History from '../models/History';
import Access from '../models/Access';
import Session from '../models/Session';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../socket';
import { catchAsync } from '../middleware/errorMiddleware';
import { t } from '../utils/i18n';
import { UserRole } from '../types/enums';
import { 
    UnauthorizedException, 
    ConflictException, 
    InternalServerException
} from '../exceptions/HttpExceptions';

// Helper to safely get language from user
const getLang = (req: AuthRequest) => (req.user as any)?.language;

export const createProject = catchAsync(async (req: AuthRequest, res: Response) => {
    const { roomId, name, config } = req.body;
    
    let project = await Project.findOne({ roomId });

    if (!project) {
        if (!req.user) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));

        // Check if a project with the same name already exists
        const existingProjectWithName = await Project.findOne({ 
            name: name || `Project ${roomId}`,
            isDeleted: false 
        });

        if (existingProjectWithName) {
             throw new ConflictException(
                "You have no access for this room. Please contact the author of the room or create a room with a different name.",
                "ROOM_NAME_EXISTS"
            );
        }

        project = await Project.create({
            roomId,
            name: name || `Project ${roomId}`,
            ownerId: req.user._id,
            config: config
        });

        // Create Access Record for this (new) project
        await Access.create({
            projectId: project._id,
            authorId: req.user._id,
            access_granted: [{ 
                userId: req.user._id,
                authorised: true, // Creator is authorized
                role: UserRole.ADMIN,
                visible: true,
                joinedAt: new Date()
            }]
        });
    }
    res.json({ success: true, project });
});

export const deleteProject = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const project = req.project;
    const projectId = project._id;

    await Node.deleteMany({ projectId });
    await Edge.deleteMany({ projectId });
    await Comment.deleteMany({ projectId });
    await History.deleteMany({ projectId });
    await Access.updateMany({ projectId }, { isDeleted: true }); 
    await Session.deleteMany({ roomId: project.roomId }); 

    project.isDeleted = true;
    await project.save();
    
    getIO().to(project.roomId).emit('room:deleted');
    
    res.json({ success: true });
});

export const updateProjectBackground = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project || !req.user) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const { color } = req.body;
    
    const config = req.project.config || {};
    config.canvasBg = color;
    
    req.project.config = config;
    req.project.markModified('config');
    await req.project.save();
    
    const userEmail = req.user.email;
    if (userEmail) {
        await User.findOneAndUpdate({ email: userEmail }, { canvasBg: color });
    }
    
    getIO().to(req.params.projectId).emit('project:settings', { backgroundColor: color });
    
    res.json({ success: true });
});

export const updateProjectConfig = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const { config } = req.body; // Partial config
    
    const currentConfig = req.project.config || {};
    const newConfig = { ...currentConfig, ...config };
    
    req.project.config = newConfig;
    req.project.markModified('config');
    await req.project.save();
    
    getIO().to(req.params.projectId).emit('project:settings', { config: newConfig });
    
    res.json({ success: true });
});

export const saveProject = catchAsync(async (req: AuthRequest, res: Response) => {
    const { email, project: pData } = req.body;
    // pData: { id, name, author, role, url }
    
    if (!req.user) {
        throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    }
    
    const roomId = pData.id;
    let project = await Project.findOne({ roomId });
    
    if (!project) {
        try {
            project = await Project.create({
                roomId,
                name: pData.name || `Project ${roomId}`,
                ownerId: req.user._id,
                config: {}
            });
            
            await Access.create({
                projectId: project._id,
                authorId: req.user._id,
                access_granted: [{ 
                    userId: req.user._id,
                    authorised: true, 
                    role: UserRole.ADMIN, 
                    visible: true,
                    joinedAt: new Date()
                }]
            });
        } catch (createErr: any) {
            if (createErr.code === 11000) {
                    project = await Project.findOne({ roomId });
            } else {
                throw createErr;
            }
        }
    }
    
    if (!project) throw new InternalServerException("Failed to resolve project");

    const accessDoc = await Access.findOne({ projectId: project._id, isDeleted: false });
    if (accessDoc) {
            const exists = accessDoc.access_granted.find(u => u.userId.toString() === req.user?._id.toString());
            if (!exists) {
                let roleStr = UserRole.VIEWER;
                if (project.ownerId.toString() === req.user._id.toString()) {
                    roleStr = UserRole.ADMIN;
                }

                accessDoc.access_granted.push({
                    userId: req.user._id,
                    authorised: true,
                    visible: true,
                    role: roleStr,
                    joinedAt: new Date()
                });
                await accessDoc.save();
            }
    }

    res.json({ success: true, projectId: project.roomId });
});
