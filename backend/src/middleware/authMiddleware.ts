import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Project, { IProject } from '../models/Project';
import Access from '../models/Access';
import { JWT_SECRET } from '../config';

// Extended Request Interface
export interface AuthRequest extends Request {
    user?: IUser;
    project?: IProject;
    role?: string;
}

// Middleware to verify token and get user
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Check Header
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized: No token provided" });

    // 2. Extract Token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: "Unauthorized: Token format error" });
    }
    const token = parts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        // Find User by email or ID
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(401).json({ error: "User not found" });
        req.user = user;
        next();
    } catch (err) {
         console.error("[Auth] Token Verification Failed:", (err as Error).message);
         return res.status(401).json({ error: "Invalid Token" });
    }
};

// Middleware to check project access
export const checkAccess = (roleRequired: string[] = ['Viewer', 'Editor', 'Admin', 'host']) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Support BOTH projectId and roomId parameter names
        // Some routes use /:projectId/..., others use /:roomId/...
        const projectIdStr = req.params.projectId || req.params.roomId;

        try {
            const project = await Project.findOne({ roomId: projectIdStr });
            if (!project) return res.status(404).json({ error: "Project not found" });
            req.project = project;

            // Authentication Force Check
            if (!req.user) return res.status(401).json({ error: "User not authenticated" });
            const user = req.user;
            
            // 1. Host has ALL permissions (God Mode)
            if (project.ownerId.toString() === user._id.toString()) {
                req.role = 'host';
                return next();
            }

            // 2. Fetch User Access Record
            const accessDoc = await Access.findOne({ 
                projectId: project._id, 
                isDeleted: false 
            });
            
            let userAccess = accessDoc?.access_granted.find(u => u.userId.toString() === user._id.toString());

             // If not found by ID, try to find by email if invited (and link it)
            if (!userAccess && user.email) {
                 const invitedIndex = accessDoc?.access_granted.findIndex(u => u.invitedEmail === user.email);

                 if (invitedIndex !== undefined && invitedIndex !== -1 && accessDoc) {
                     // Link user profile to this invite slot
                     accessDoc.access_granted[invitedIndex].userId = user._id;
                     accessDoc.access_granted[invitedIndex].joinedAt = new Date();
                     await accessDoc.save();
                     userAccess = accessDoc.access_granted[invitedIndex];
                 }
            }
            
            if (!userAccess) {
                return res.status(403).json({ 
                    error: "You have no access for this room.",
                    code: "NO_ACCESS"
                });
            }

            // 3. Role Hierarchy Check
            // We define hierarchy: Viewer < Editor < Admin < host
            const roleHierarchy: Record<string, number> = {
                'Viewer': 1,
                'Editor': 2,
                'Admin': 3,
                'host': 4
            };

            const userRoleScore = roleHierarchy[userAccess.role] || 0;
            const requiredScores = roleRequired.map(r => roleHierarchy[r] || 0);
            
            if (!roleRequired.includes(userAccess.role) && req.role !== 'host') {
                 return res.status(403).json({ 
                    error: "Insufficient Permissions",
                    required: roleRequired,
                    current: userAccess.role
                });
            }

            req.role = userAccess.role;
            next();

        } catch (e) {
            console.error("Access Check Failed", e);
            res.status(500).json({ error: "Access Check Failed" });
        }
    };
};
