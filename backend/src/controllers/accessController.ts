import { Response } from 'express';
import Access from '../models/Access';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../socket';
import { IUser } from '../models/User';

export const getAccessList = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project) return res.status(401).json({ error: "Context missing" });
        const projectId = req.project._id;

        const accessDoc = await Access.findOne({ projectId })
            .populate('access_granted.userId', 'name email');

        if (!accessDoc) {
             return res.json({ success: true, users: [] });
        }

        const users = accessDoc.access_granted.map((uItem) => {
            const u = uItem as unknown as { userId: IUser & { _id: string }, invitedEmail?: string, role: string, visible: boolean, joinedAt: Date };

            return {
                id: u.userId._id ?? u.userId,
                userId: u.userId._id ?? u.userId,
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
    } catch { res.status(500).json({ error: "Failed to fetch access list" }); }
};

export const updateAccessRole = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project || !req.user || !req.role) return res.status(401).json({ error: "Context missing" });
        const { targetUserId, role } = req.body;
        const project = req.project;
        const callerRole = req.role;
        const callerId = req.user._id.toString();

        if (!['Admin', 'Editor', 'Viewer'].includes(role)) return res.status(400).json({ error: "Invalid Role" });
        if (project.ownerId.toString() === targetUserId) return res.status(403).json({ error: "Cannot change project owner role" });

        if (callerRole === 'Editor') {
            if (targetUserId === callerId) return res.status(403).json({ error: "Editors cannot change their own role" });
            if (role === 'Admin') return res.status(403).json({ error: "Editors cannot promote users to Admin" });
        }

        const accessDoc = await Access.findOne({ projectId: project._id });
        if (!accessDoc) return res.status(404).json({ error: "Access list not found" });

        const memberIdx = accessDoc.access_granted.findIndex(u => u.userId.toString() === targetUserId);
        if (memberIdx === -1) return res.status(404).json({ error: "User not found in project" });
        
        const targetMember = accessDoc.access_granted[memberIdx];

        if (callerRole === 'Editor' && targetMember.role === 'Admin') return res.status(403).json({ error: "Editors cannot modify Admins" });

        accessDoc.access_granted[memberIdx].role = role;
        await accessDoc.save();

        getIO().to(req.params.projectId).emit('access:updated', { userId: targetUserId, role });

        res.json({ success: true, role });
    } catch { res.status(500).json({ error: "Failed to update role" }); }
};

export const removeAccess = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project || !req.user || !req.role) return res.status(401).json({ error: "Context missing" });
        const { targetUserId } = req.params;
        const project = req.project;
        const callerRole = req.role;
        const callerId = req.user._id.toString();

        if (project.ownerId.toString() === targetUserId) return res.status(403).json({ error: "Cannot remove project owner" });

        if (callerRole === 'Editor' && targetUserId === callerId) return res.status(403).json({ error: "Editors cannot remove themselves (Leave instead)" });

        const accessDoc = await Access.findOne({ projectId: project._id });
        if (!accessDoc) return res.status(404).json({ error: "Access list not found" });
        
        const targetMember = accessDoc.access_granted.find(u => u.userId.toString() === targetUserId);
        if (!targetMember) return res.status(404).json({ error: "User not involved" });

        if (callerRole === 'Editor' && targetMember.role === 'Admin') return res.status(403).json({ error: "Editors cannot remove Admins" });

        await Access.findOneAndUpdate(
            { projectId: project._id },
            { $pull: { access_granted: { userId: targetUserId } } }
        );

        getIO().to(req.params.projectId).emit('user:removed', {
            userId: targetUserId,
            message: `User removed from project by ${req.user.name}`
        });

        res.json({ success: true, message: "User removed from project" });
    } catch { res.status(500).json({ error: "Failed to remove user" }); }
};
