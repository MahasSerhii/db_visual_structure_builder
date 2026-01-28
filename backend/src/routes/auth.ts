import { Router, Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Project from '../models/Project';
import Access from '../models/Access';
import { sendEmail } from '../utils/email';

// Interface for the decoded User from JWT (payload)
interface UserPayload extends JwtPayload {
    email: string;
    id: string;
}

// Extend Express Request
interface AuthRequest extends Request {
    user?: UserPayload;
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        (req as AuthRequest).user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid Token" });
    }
};

router.post('/invite', authenticate, async (req: Request, res: Response) => {
    try {
        const { email, roomId, configStr, permissions, hostName, projectName, origin } = req.body;
        console.log(`[Invite START] Email: ${email}, RoomId: ${roomId}, Permissions: ${permissions}`);
        
        const inviteToken = jwt.sign({ 
            email, roomId, configStr, permissions, projectName, hostName, 
            origin: origin || CLIENT_URL
        }, JWT_SECRET, { expiresIn: '7d' });

        const project = await Project.findOne({ roomId });
        console.log(`[Invite] Project lookup result:`, project ? `Found (ID: ${project._id})` : 'NOT FOUND');
        
        if (!project) {
            console.error(`[Invite ERROR] Project with roomId "${roomId}" not found in database!`);
            return res.status(404).json({ error: "Project not found. Please ensure the room exists." });
        }
        
        // Try to find existing user by email
        let user = await User.findOne({ email });
        console.log(`[Invite] User lookup result:`, user ? `Found (ID: ${user._id}, Authorized: ${user.authorized})` : 'NOT FOUND');
        
        // If user doesn't exist, create a new pre-registered user
        if (!user) {
            user = await User.create({
                email,
                name: email.split('@')[0], // Use email prefix as default name
                color: '#6366F1', // Default color
                authorized: false, // Not yet authorized until they login
                visible: true
            });
            console.log(`[User Created] Pre-registered user: ${email} (ID: ${user._id})`);
        } else {
            console.log(`[User Exists] Using existing user: ${email} (ID: ${user._id})`);
        }
        
        // Create or update Access record with the user ID
        const accessResult = await Access.findOneAndUpdate(
            { projectId: project._id as any, userId: user._id as any },
            { 
                $set: {
                    projectId: project._id,
                    userId: user._id,
                    invitedEmail: email, // Keep for reference
                    role: permissions === 'rw' ? 'writer' : 'viewer',
                    isDeleted: false
                }
            },
            { upsert: true, new: true }
        );
        console.log(`[Access Created/Updated] AccessID: ${accessResult._id}, Role: ${accessResult.role}, ProjectID: ${accessResult.projectId}, UserID: ${accessResult.userId}`);

        const link = `${origin}?invite_token=${inviteToken}`;
        console.log(`[Invite Generated] Link: ${link}`);

        // Only send email if not requested to skip
        if (!req.body.skipEmail) {
            try {
                await sendEmail(email, `Invitation to ${projectName || 'Project'}`, 
                    `<p>Click <a href="${link}">here</a> to join.</p>`
                );
                console.log(`[Invite Sent] Email dispatched to ${email}`);
            } catch (mailError) {
                console.error("[Invite Email Failed] But responding success to UI", mailError);
                // We still return success because the link was generated and permission granted
            }
        } else {
             console.log(`[Invite] Email sending skipped by request`);
        }

        // Always return link if it was requested specifically (e.g. for "Copy Link" feature) 
        // OR if in dev mode
        const returnLink = req.body.skipEmail || process.env.NODE_ENV === 'development';

        res.json({ success: true, link: returnLink ? link : undefined });
    } catch (e) {
        const err = e as Error;
        console.error("Invite Error Global:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/validate-invite', async (req: Request, res: Response) => {
    try {
        const token = req.query.token as string;
        if (!token) throw new Error("No token");
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload & { roomId: string, configStr: string, permissions: string };
        
        const existingUser = await User.findOne({ email: decoded.email });

        res.json({
            valid: true,
            email: decoded.email,
            isRegistered: !!existingUser,
            roomId: decoded.roomId,
            configStr: decoded.configStr,
            permissions: decoded.permissions
        });
    } catch (e) { res.status(400).json({ valid: false }); }
});

router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, inviteToken, name, color } = req.body;
        console.log(`[Register Attempt] Email: ${email}`);

        let user = await User.findOne({ email });
        if (user && user.authorized) {
             // User exists and is already authorized
             console.log(`[Register] User exists: ${email}`);
             const resetToken = jwt.sign({ email: user.email, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
             const link = `${CLIENT_URL}?reset_token=${resetToken}`;
             
             try {
                await sendEmail(email, "Access Restoration", 
                    `<p>You attempted to register but already have an account.</p>
                     <p>To access your account, please <a href="${link}">reset your password here</a>.</p>`
                );
             } catch(mailErr) {
                 console.error("Failed to send restoration email", mailErr);
             }
             return res.json({ success: true, message: "User exists. Restoration link sent to email." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (!user) {
            // New user
            user = await User.create({
                email,
                password: hashedPassword,
                name: name || email.split('@')[0], 
                color: color || '#'+Math.floor(Math.random()*16777215).toString(16),
                visible: true,
                authorized: true // Mark as authorized on registration
            });
        } else {
            // Pre-registered user (invited), now authorizing
            user = await User.findByIdAndUpdate(
                user._id,
                {
                    password: hashedPassword,
                    name: name || user.name,
                    color: color || user.color,
                    authorized: true // Mark as authorized
                },
                { new: true }
            );
        }

        if (inviteToken && typeof inviteToken === 'string' && user) {
            try {
                console.log("Processing invite token...");
                const decoded = jwt.verify(inviteToken, JWT_SECRET) as UserPayload & { roomId: string };
                if (decoded.roomId) {
                     const project = await Project.findOne({ roomId: decoded.roomId });
                     if (project) {
                         await Access.findOneAndUpdate(
                             { projectId: project._id as any, userId: user._id as any },
                             { $set: { userId: user._id } }, 
                             { new: true }
                         );
                     }
                }
            } catch(e) {
                console.warn("Invalid Invite Token during register", e);
            }
        }

        if (!user) {
            return res.status(500).json({ error: "User creation failed" });
        }

        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        console.log(`[Register Success] User: ${user.email} (ID: ${user._id})`);
        res.json({ token, user, projects: [] });
    } catch (e) { 
        console.error("Register Error Global:", e);
        res.status(500).json({ error: "Register Failed" }); 
    }
});

router.post('/social-login', async (req: Request, res: Response) => {
    try {
        const { email, name, uid, inviteToken } = req.body;
        
        let user = await User.findOne({ email });
        if (!user) {
             user = await User.create({
                 email, 
                 name: name || email.split('@')[0],
                 color: '#'+Math.floor(Math.random()*16777215).toString(16),
                 visible: true,
             });
        }
        
        if (inviteToken) {
             try {
                const decoded = jwt.verify(inviteToken, JWT_SECRET) as UserPayload & { roomId: string };
                if (decoded.roomId) {
                     const project = await Project.findOne({ roomId: decoded.roomId });
                     if (project) {
                         await Access.findOneAndUpdate(
                             { projectId: project._id as any, invitedEmail: email },
                             { userId: user._id }, 
                             { new: true }
                         );
                     }
                }
            } catch(e) {}
        }
        
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        const ownedProjects = await Project.find({ ownerId: user._id as any });
        const accessRecords = await Access.find({ userId: user._id as any }).populate('projectId');
        
        const projects = [
            ...ownedProjects.map(p => ({
                id: p.roomId, name: p.name, role: 'owner', lastAccessed: p.updatedAt
            })),
            ...accessRecords.map((a: any) => ({
                id: a.projectId.roomId, name: a.projectId.name, role: a.role, lastAccessed: a.updatedAt
            }))
        ];
        
        res.json({ token, user, projects });

    } catch(e) {
        console.error("Social Login Error", e);
        res.status(500).json({ error: "Social Login Failed" });
    }
});

router.post('/request-reset-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        console.log(`[PwdReset Request] Email: ${email}`);
        const user = await User.findOne({ email });
        if (user) {
             const resetToken = jwt.sign({ email: user.email, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
             const link = `${CLIENT_URL}?reset_token=${resetToken}`;
             
             try {
                await sendEmail(email, "Password Reset", 
                    `<p>Click <a href="${link}">here</a> to reset your password.</p>`
                );
                console.log(`[PwdReset] Email sent to ${email}`);
             } catch(mailErr) {
                 console.error("[PwdReset] Mail Failed", mailErr);
                 // We still return success to avoiding leaking info, but log it
             }
        } else {
            console.log(`[PwdReset] User not found: ${email}`);
        }
        // Always return success to prevent user enumeration
        res.json({ success: true });
    } catch(e) { 
        console.error("Request Reset Failed", e);
        res.status(500).json({ error: "Request Failed" }); 
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded || decoded.type !== 'reset') throw new Error("Invalid Token");
        
        const user = await User.findOne({ email: decoded.email });
        if (!user) return res.status(404).json({ error: "User not found" });
        
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({ success: true });
    } catch(e) { res.status(400).json({ error: "Invalid or expired token" }); }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password, rememberMe, name, color } = req.body;
        let user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) return res.status(401).json({ error: "Invalid Credentials" });
        
        // If pre-registered user logging in for first time, set authorized to true
        if (!user.authorized) {
            user.authorized = true;
            if (name) user.name = name;
            if (color) user.color = color;
        }
        
        user.lastActive = new Date();
        user.rememberMe = !!rememberMe; // Update preference
        await user.save();

        // 1 day default, or 365 days if rememberMe
        const expiresIn = rememberMe ? '365d' : '1d';
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn });
        
        const ownedProjects = await Project.find({ ownerId: user._id as any });
        const accessRecords = await Access.find({ userId: user._id as any }).populate('projectId');
        
        const projects = [
            ...ownedProjects.map(p => ({
                id: p.roomId, name: p.name, role: 'owner', lastAccessed: p.updatedAt
            })),
            ...accessRecords.map((a: any) => ({
                id: a.projectId.roomId, name: a.projectId.name, role: a.role, lastAccessed: a.updatedAt
            }))
        ];

        res.json({ token, user, projects });
    } catch(e) { 
        console.error("Login Error", e);
        res.status(500).json({ error: "Login Error" }); 
    }
});

router.post('/verify-access', async (req: Request, res: Response) => {
    try {
       const { token, roomId } = req.body;
       if (!token) return res.json({ allowed: false });

       const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
       const user = await User.findOne({ email: decoded.email });
       if (!user) return res.json({ allowed: false });
       
       const project = await Project.findOne({ roomId });
       if (!project) return res.json({ allowed: true, role: 'host' }); 

       if (project.ownerId.toString() === user._id.toString()) {
           return res.json({ allowed: true, role: 'host' });
       }
       
       // Check access by userId first
       let access = await Access.findOne({ 
           projectId: project._id as any, 
           userId: user._id as any,
           isDeleted: false 
       });
       
       // If not found by userId, check by email (for invited users)
       if (!access) {
           access = await Access.findOne({ 
               projectId: project._id as any, 
               invitedEmail: user.email,
               isDeleted: false 
           });
           
           // If found by email, update userId to link the account
           if (access) {
               access.userId = user._id as any;
               await access.save();
               console.log(`[Access Linked] User ${user.email} linked to Access record`);
           }
       }
       
       if (access) return res.json({ allowed: true, role: access.role });
       
       res.json({ allowed: false });
    } catch(e) { 
        console.error('[verify-access error]', e);
        res.status(401).json({ allowed: false }); 
    }
});

router.put('/profile', authenticate, async (req: Request, res: Response) => {
    try {
        const { visible, name, color, profileUpdatedAt } = req.body;
        // The user payload is in req.user, but we should verify it exists
        const userEmail = (req as AuthRequest).user?.email;
        if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

        const user = await User.findOne({ email: userEmail });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Conflict Resolution strategy:
        // If client sends a timestamp, compare it with DB.
        // If DB is newer (and client timestamp exists), we might want to return the DB version?
        // But usually PUT /profile means "User explicitly saved settings in UI", so this should win.
        // However, if it's an auto-sync, we need to be careful.
        // For now, allow overwrite if explicitly requested via PUT.
        
        if (visible !== undefined) user.visible = visible;
        if (name) user.name = name;
        if (color) user.color = color;
        if (profileUpdatedAt) user.profileUpdatedAt = new Date(profileUpdatedAt);
        else user.profileUpdatedAt = new Date(); // Always update timestamp on change
        
        await user.save();
        res.json({ success: true, user });
    } catch(e) {
        res.status(500).json({ error: "Update Failed "});
    }
});

export default router;