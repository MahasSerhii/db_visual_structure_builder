import { Response } from 'express';
import Access from '../models/Access';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../socket';
import { IUser } from '../models/User';
import { catchAsync } from '../middleware/errorMiddleware';
import { t } from '../utils/i18n';
import { UserRole } from '../types/enums';
import { 
    UnauthorizedException, 
    BadRequestException,
    ForbiddenException,
    NotFoundException
} from '../exceptions/HttpExceptions';

const getLang = (req: AuthRequest) => (req.user as any)?.language;

export const getAccessList = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const projectId = req.project._id;

    const accessDoc = await Access.findOne({ projectId })
        .populate('access_granted.userId', 'name email');

    if (!accessDoc) {
            return res.json({ success: true, users: [] });
    }

    const users = accessDoc.access_granted.map((uItem) => {
        const u = uItem as unknown as { userId: IUser & { _id: string }, invitedEmail?: string, role: string, visible: boolean, joinedAt: Date };
        
        const uid = u.userId._id ?? u.userId;

        return {
            id: uid,
            accessId: uid, // Needed for frontend identification
            userId: uid,
            name: u.userId.name || 'Unknown',
            email: u.userId.email || u.invitedEmail || 'Unknown',
            role: u.role,
            isVisible: u.visible,
            isDeleted: false, 
            invitedEmail: u.invitedEmail,
            createdAt: u.joinedAt
        };
    });

    res.json({ success: true, users });
});

export const updateAccessRole = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project || !req.user || !req.role) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const { targetUserId, role } = req.body;
    const project = req.project;
    const callerRole = req.role;
    const callerId = req.user._id.toString();

    // Check if role is valid enum value
    if (!Object.values(UserRole).includes(role)) throw new BadRequestException("Invalid Role");
    if (project.ownerId.toString() === targetUserId) throw new ForbiddenException("Cannot change project owner role");

    if (callerRole === UserRole.EDITOR) {
        if (targetUserId === callerId) throw new ForbiddenException("Editors cannot change their own role");
        if (role === UserRole.ADMIN) throw new ForbiddenException("Editors cannot promote users to Admin");
    }

    const accessDoc = await Access.findOne({ projectId: project._id });
    if (!accessDoc) throw new NotFoundException("Access list not found");

    const memberIdx = accessDoc.access_granted.findIndex(u => u.userId.toString() === targetUserId);
    if (memberIdx === -1) throw new NotFoundException(t(getLang(req), "error.auth.user_not_found"));
    
    const targetMember = accessDoc.access_granted[memberIdx];

    if (callerRole === UserRole.EDITOR && targetMember.role === UserRole.ADMIN) throw new ForbiddenException("Editors cannot modify Admins");

    accessDoc.access_granted[memberIdx].role = role;
    await accessDoc.save();

    getIO().to(req.params.projectId).emit('access:updated', { userId: targetUserId, role });

    res.json({ success: true, role });
});

export const removeAccess = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project || !req.user || !req.role) throw new UnauthorizedException(t(getLang(req), "error.history.context_missing"));
    const { targetUserId } = req.params;
    const project = req.project;
    const callerRole = req.role;
    const callerId = req.user._id.toString();

    if (project.ownerId.toString() === targetUserId) throw new ForbiddenException("Cannot remove project owner");

    if (callerRole === UserRole.EDITOR && targetUserId === callerId) throw new ForbiddenException("Editors cannot remove themselves (Leave instead)");

    const accessDoc = await Access.findOne({ projectId: project._id });
    if (!accessDoc) throw new NotFoundException("Access list not found");
    
    const targetMember = accessDoc.access_granted.find(u => u.userId.toString() === targetUserId);
    if (!targetMember) throw new NotFoundException(t(getLang(req), "error.auth.user_not_found"));

    if (callerRole === UserRole.EDITOR && targetMember.role === UserRole.ADMIN) throw new ForbiddenException("Editors cannot remove Admins");

    await Access.findOneAndUpdate(
        { projectId: project._id },
        { $pull: { access_granted: { userId: targetUserId } } }
    );

    getIO().to(req.params.projectId).emit('user:removed', {
        userId: targetUserId,
        removerName: req.user.name
    });

    res.json({ success: true });
});
