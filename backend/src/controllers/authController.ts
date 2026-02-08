import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Project, { IProject } from '../models/Project';
import Access, { IAccess, IAccessUser } from '../models/Access';
import { sendEmail } from '../utils/email';
import { JWT_SECRET, CLIENT_URL } from '../config';
import { catchAsync } from '../middleware/errorMiddleware';
import { NotFoundException, BadRequestException, UnauthorizedException } from '../exceptions/HttpExceptions';
import { t, getLanguageFromRequest } from '../utils/i18n';
import { UserRole } from '../types/enums';

interface UserPayload extends JwtPayload {
    email: string;
    id: string;
}

export const inviteUser = catchAsync(async (req: Request, res: Response) => {
    // try { // Removing legacy try-catch
        const { email, projectId, configStr, permissions, hostName, projectName, origin } = req.body;

        console.log(`[Invite START] Email: ${email}, ProjectID: ${projectId}, Permissions: ${permissions}`);
        
        const inviteToken = jwt.sign({ 
            email, projectId, configStr, permissions, projectName, hostName, 
            origin: origin || CLIENT_URL
        }, JWT_SECRET, { expiresIn: '7d' });

        // Logic updated: FIND BY _ID ONLY
        let project = null;
        if (mongoose.isValidObjectId(projectId)) {
             project = await Project.findOne({ _id: projectId });
        }
        
        console.log(`[Invite] Project lookup result:`, project ? `Found (ID: ${project._id})` : 'NOT FOUND');
        
        if (!project) {
            console.error(`[Invite ERROR] Project with ID "${projectId}" not found in database!`);
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
            });
            console.log(`[User Created] Pre-registered user: ${email} (ID: ${user._id})`);
        } else {
            console.log(`[User Exists] Using existing user: ${email} (ID: ${user._id})`);
        }
        
        // Create or update Access record with the user ID
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        let accessDoc = await Access.findOne({ projectId: project._id });
        
        if (!accessDoc) {
             accessDoc = new Access({
                projectId: project._id,
                authorId: project.ownerId,
                access_granted: []
             });
        }
        
        const newRole = permissions === 'rw' ? UserRole.EDITOR : UserRole.VIEWER;
        const existingIndex = accessDoc.access_granted.findIndex(u => u.userId.toString() === user!._id.toString());
        
        if (existingIndex > -1) {
            accessDoc.access_granted[existingIndex].role = newRole; 
            accessDoc.access_granted[existingIndex].invitedEmail = email;
        } else {
            accessDoc.access_granted.push({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                userId: user._id, 
                authorised: false,
                role: newRole,
                visible: true,
                invitedEmail: email,
                joinedAt: new Date()
            });
        }
        
        await accessDoc.save();
        console.log(`[Access Updated] ProjectID: ${project._id}, UserID: ${user._id}, Role: ${newRole}`);

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
            }
        } else {
             console.log(`[Invite] Email sending skipped by request`);
        }

        const returnLink = req.body.skipEmail || process.env.NODE_ENV === 'development';

        res.json({ success: true, link: returnLink ? link : undefined });
});

export const validateInvite = catchAsync(async (req: Request, res: Response) => {
    const token = req.query.token as string;

    if (!token) throw new BadRequestException(t(getLanguageFromRequest(req), "error.auth.invalid_token"));
    
    // Explicitly verify or let generic error handler catch JsonWebTokenError
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload & { projectId: string, configStr: string, permissions: string };
    
    const existingUser = await User.findOne({ email: decoded.email });

    res.json({
        valid: true,
        email: decoded.email,
        isRegistered: !!existingUser,
        projectId: decoded.projectId, 
        configStr: decoded.configStr,
        permissions: decoded.permissions
    });
});

export const register = catchAsync(async (req: Request, res: Response) => {
    // try {
        const { email, password, inviteToken, name, color } = req.body;

        console.log(`[Register Attempt] Email: ${email}`);

        let user = await User.findOne({ email });

        if (user && user.authorized) {
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
             
             throw new BadRequestException(t(getLanguageFromRequest(req), "error.auth.email_exists"));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (!user) {
            // New user
            user = await User.create({
                email,
                password: hashedPassword,
                name: name || email.split('@')[0], 
                color: color || '#'+Math.floor(Math.random()*16777215).toString(16),
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
                const decoded = jwt.verify(inviteToken, JWT_SECRET) as UserPayload & { projectId: string };

                if (decoded.projectId) {
                     let project = null;
                     if (mongoose.isValidObjectId(decoded.projectId)) {
                         project = await Project.findOne({ _id: decoded.projectId });
                     }

                     if (project) {
                        // Logic for invites already handles access creation. 
                        // But good to double check if needed.
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
        
        const userObj = {
            id: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            lastActive: user.lastActive?.getTime() || Date.now(),
            language: user.language,
            theme: user.theme,
            componentBg: user.componentBg,
            propertyText: user.propertyText,
            canvasBg: user.canvasBg
        };
        
        res.json({ token, user: userObj, projects: [] });
    // } catch (e) { 
    //    console.error("Register Error Global:", e);
    //    res.status(500).json({ error: "Register Failed" }); 
    // }
});

export const login = catchAsync(async (req: Request, res: Response) => {
    // try {
        const { email, password, rememberMe, name, color } = req.body;
        const user = await User.findOne({ email });
        
        // Use browser language if user not found, otherwise user's preferred language
        const lang = user ? user.language : getLanguageFromRequest(req);

        if (!user) throw new NotFoundException(t(lang, "error.auth.user_not_found"));

        const isMatch = await bcrypt.compare(password, user.password || '');

        if (!isMatch) throw new UnauthorizedException(t(lang, "error.auth.wrong_password"));
        
        if (!user.authorized) {
            user.authorized = true;
            if (name) user.name = name;
            if (color) user.color = color;
        }
        
        user.lastActive = new Date();
        user.rememberMe = !!rememberMe; 
        await user.save();

        const expiresIn = rememberMe ? '365d' : '1d';
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn });
        
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const ownedProjects = await Project.find({ ownerId: user._id, isDeleted: false });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const accessRecords = await Access.find({ "access_granted.userId": user._id, isDeleted: false })
            .populate({ path: 'projectId', match: { isDeleted: false } });
        
        const projects = [
            ...ownedProjects.map(p => ({
                id: p._id.toString(), projectId: p._id.toString(), roomId: p.roomId, name: p.name, role: 'owner', lastAccessed: p.updatedAt
            })),
            ...accessRecords
                .filter((record: any) => record.projectId)
                .map((record) => {
                 const a = record as unknown as (IAccess & { projectId: IProject });
                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
                 const u = a.access_granted.find((participant) => participant.userId.toString() === user!._id.toString());
                 // a.projectId is a populated object here.
                 // We need to access _id from it.
                 const pId = a.projectId._id.toString(); 

                 return {
                    id: pId, projectId: pId, roomId: a.projectId.roomId, name: a.projectId.name, role: u ? u.role : 'Viewer', lastAccessed: a.updatedAt
                 };
            })
        ];

        const userObj = {
            id: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            lastActive: user.lastActive?.getTime() || Date.now(),
            language: user.language,
            theme: user.theme,
            componentBg: user.componentBg,
            propertyText: user.propertyText,
            canvasBg: user.canvasBg
        };

        res.json({ token, user: userObj, projects });
});

export const verifyAccess = async (req: Request, res: Response) => {
    try {
       const { token, projectId } = req.body;

       if (!token) return res.json({ allowed: false });

       let decoded: UserPayload;
       try {
           decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
       } catch (err) {
           // Token expired or invalid
           console.warn('[verify-access] Token invalid/expired:', err);
           return res.json({ allowed: false });
       }
       
       const user = await User.findOne({ email: decoded.email });

       if (!user) return res.json({ allowed: false });
       
       let project = null;
       if (mongoose.isValidObjectId(projectId)) {
            project = await Project.findOne({ _id: projectId, isDeleted: false });
       }
       // Legacy fallback removed

       // If project does not exist yet, and we have a valid user, they might be about to create it.
       // Allow them to proceed so they can hit the /init endpoint.
       if (!project) {
           return res.json({ allowed: true, role: UserRole.ADMIN, status: 'project_not_found_but_user_valid' }); 
       }

       if (project.ownerId.toString() === user._id.toString()) {
           return res.json({ allowed: true, role: UserRole.ADMIN });
       }
       
       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
       // @ts-ignore
       const accessDoc = await Access.findOne({ 
           projectId: project._id, 
           isDeleted: false 
       });

       let accessUser: IAccessUser | undefined;

       if (accessDoc) {
           accessUser = accessDoc.access_granted.find((participant) => participant.userId.toString() === user!._id.toString());
           
           if (!accessUser && user!.email) {
                const index = accessDoc.access_granted.findIndex((participant) => participant.invitedEmail === user!.email);
                if (index > -1) {
                    accessDoc.access_granted[index].userId = user!._id;
                    await accessDoc.save();
                    accessUser = accessDoc.access_granted[index];
                }
           }
       }
       
       if (accessUser) return res.json({ allowed: true, role: accessUser.role });
       
       res.json({ allowed: false });
    } catch(e) { 
        console.error('[verify-access error]', e);
        res.status(401).json({ allowed: false }); 
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
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
            } catch(mailErr) { console.error("[PwdReset] Mail Failed", mailErr); }
        }
        res.json({ success: true });
    } catch(e) { 
        console.error("Request Reset Failed", e);
        res.status(500).json({ error: "Request Failed" }); 
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload & { type: string };

        if (!decoded || decoded.type !== 'reset') throw new Error("Invalid Token");
        
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ error: "User not found" });
        
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({ success: true });
    } catch { res.status(400).json({ error: "Invalid or expired token" }); }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { name, color, profileUpdatedAt, language, theme, componentBg, propertyText, canvasBg } = req.body;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userEmail = (req as any).user?.email;

        if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

        const user = await User.findOne({ email: userEmail });

        if (!user) return res.status(404).json({ error: "User not found" });
        
        if (name) user.name = name;
        if (color) user.color = color;
        if (profileUpdatedAt) user.profileUpdatedAt = new Date(profileUpdatedAt);
        else user.profileUpdatedAt = new Date(); 
        
        if (language) user.language = language;
        if (theme) user.theme = theme;
        if (componentBg) user.componentBg = componentBg;
        if (propertyText) user.propertyText = propertyText;
        if (canvasBg) user.canvasBg = canvasBg;

        await user.save();

        const userObj = {
            id: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            lastActive: user.lastActive?.getTime() || Date.now(),
            language: user.language,
            theme: user.theme,
            componentBg: user.componentBg,
            propertyText: user.propertyText,
            canvasBg: user.canvasBg
        };

        res.json({ success: true, user: userObj });
    } catch {
        res.status(500).json({ error: "Update Failed "});
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userEmail = (req as any).user?.email;

        if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });
        
        const user = await User.findOne({ email: userEmail });

        if (!user) return res.status(404).json({ error: "User not found" });
        
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const ownedProjects = await Project.find({ ownerId: user._id, isDeleted: false });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const accessRecords = await Access.find({ "access_granted.userId": user._id, isDeleted: false })
            .populate({ path: 'projectId', match: { isDeleted: false } })
            .populate('authorId', 'name');

        const projects = [
            ...ownedProjects.map(p => ({
                id: p._id.toString(), 
                projectId: p._id.toString(), 
                roomId: p.roomId, // Added back for display/legacy
                name: p.name, 
                role: 'owner', 
                author: user.name, 
                lastAccessed: p.updatedAt ? new Date(p.updatedAt).getTime() : Date.now()
            })),
            ...accessRecords.map((record) => {
                 const a = record as unknown as (IAccess & { projectId: IProject, authorId: { name: string } });
                 if(!a.projectId || !a.projectId._id) {
                     return null;
                 }
                 
                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
                 const u = a.access_granted.find((participant) => participant.userId.toString() === user!._id.toString());
                 
                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
                 const authorName = a.authorId ? a.authorId.name : 'Unknown';
                 const pId = a.projectId._id.toString();

                 return {
                    id: pId, 
                    projectId: pId,
                    roomId: a.projectId.roomId, // Added back
                    name: a.projectId.name, 
                    role: u ? u.role : 'Viewer', 
                    author: authorName, 
                    lastAccessed: a.updatedAt ? new Date(a.updatedAt).getTime() : Date.now()
                 };
            }).filter(p => !!p)
        ];

        const userObj = {
            id: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            lastActive: user.lastActive?.getTime() || Date.now(),
            language: user.language,
            theme: user.theme,
            componentBg: user.componentBg,
            propertyText: user.propertyText,
            canvasBg: user.canvasBg
        };

        res.json({ user: userObj, projects });
    } catch {
        res.status(500).json({ error: "Fetch Failed" });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userEmail = (req as any).user?.email;
        
        if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });
        if (!oldPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });

        const user = await User.findOne({ email: userEmail });

        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password || '');

        if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

        if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true });
    } catch(e) {
        console.error("Change Password Error", e);
        res.status(500).json({ error: "Change Password Failed" });
    }
};

export const socialLogin = async (req: Request, res: Response) => {
    try {
        const { email, name, inviteToken } = req.body;
        
        let user = await User.findOne({ email });

        if (!user) {
             user = await User.create({
                 email, 
                 name: name || email.split('@')[0],
                 color: '#'+Math.floor(Math.random()*16777215).toString(16),
             });
        }
        
        if (inviteToken) {
             try {
                const decoded = jwt.verify(inviteToken, JWT_SECRET) as UserPayload & { projectId: string };
                if (decoded.projectId) {
                     // logic handled or access auto-added elsewhere?
                     // social login usually just creates user, then client might call join/init.
                     // But if we want to link automatically:
                     if (mongoose.isValidObjectId(decoded.projectId)) {
                        const project = await Project.findOne({ _id: decoded.projectId });
                        if (project) {
                             await Access.updateOne(
                                { projectId: project._id },
                                { 
                                    $addToSet: { 
                                        access_granted: { 
                                            userId: user._id, 
                                            role: 'viewer', 
                                            invitedBy: 'system',
                                            invitedEmail: email,
                                            joinedAt: new Date()
                                        } 
                                    } 
                                },
                                { upsert: true }
                             );
                        }
                     }
                }
            } catch(e) { void e; }
        }
        
        const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const ownedProjects = await Project.find({ ownerId: user._id, isDeleted: false });
        
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const accessRecords = await Access.find({ "access_granted.userId": user._id, isDeleted: false })
            .populate({ path: 'projectId', match: { isDeleted: false } });
        
        const projects = [
            ...ownedProjects.map(p => ({
                id: p._id.toString(), projectId: p._id.toString(), name: p.name, role: 'owner', lastAccessed: p.updatedAt
            })),
            ...accessRecords
                .filter((record: any) => record.projectId)
                .map((record) => {
                 const a = record as unknown as (IAccess & { projectId: IProject });
                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore 
                 const u = a.access_granted.find((participant) => participant.userId.toString() === user!._id.toString());

                 const pId = a.projectId._id.toString(); 

                 return {
                    id: pId, projectId: pId, name: a.projectId.name, role: u ? u.role : 'Viewer', lastAccessed: a.updatedAt
                 };
            })
        ];
        
        const userObj = {
            id: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            lastActive: user.lastActive?.getTime() || Date.now(),
            language: user.language,
            theme: user.theme,
            componentBg: user.componentBg,
            propertyText: user.propertyText,
            canvasBg: user.canvasBg
        };
        
        res.json({ token, user: userObj, projects });

    } catch(e) {
        console.error("Social Login Error", e);
        res.status(500).json({ error: "Social Login Failed" });
    }
};
