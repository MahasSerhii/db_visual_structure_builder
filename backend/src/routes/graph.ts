import { Router } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project';
import Node from '../models/Node';
import Edge from '../models/Edge';
import Comment from '../models/Comment';
import History from '../models/History';
import Access from '../models/Access';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { getIO } from '../socket';

// Utility to calculate Diff
const calculateNodeDiff = (oldObj: any, newObj: any) => {
    const changes: any = {};
    const details: string[] = [];
    
    // Basic Fields
    const fields = ['title', 'description', 'color', 'docLink'];
    fields.forEach(f => {
        if (oldObj[f] !== newObj[f] && (oldObj[f] || newObj[f])) {
            changes[f] = oldObj[f];
            details.push(`${f.charAt(0).toUpperCase() + f.slice(1)} changed`);
        }
    });

    // Position (allow small drift?)
    if (Math.abs((oldObj.x||0) - (newObj.x||0)) > 2 || Math.abs((oldObj.y||0) - (newObj.y||0)) > 2) {
        changes.x = oldObj.x;
        changes.y = oldObj.y;
        details.push('Position moved');
    }

    // Props
    const oldProps = oldObj.props || [];
    const newProps = newObj.props || [];
    
    if (JSON.stringify(oldProps) !== JSON.stringify(newProps)) {
        changes.props = oldProps; // Store old props to revert
        
        const oldMap = new Map(oldProps.map((p: any) => [p.name || p.id, p]));
        const newMap = new Map(newProps.map((p: any) => [p.name || p.id, p]));
        
        const added = newProps.filter((p: any) => !oldMap.has(p.name || p.id));
        const removed = oldProps.filter((p: any) => !newMap.has(p.name || p.id));
        
        if (added.length) details.push(`Added prop: ${added.map((a:any)=>a.name).join(', ')}`);
        if (removed.length) details.push(`Removed prop: ${removed.map((r:any)=>r.name).join(', ')}`);
        if (!added.length && !removed.length) details.push('Properties modified');
    }

    return { changes, detailsString: details.join(', ') };
};

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';

// Middleware to verify token and get user
const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        // Find User by email or ID
        const user = await User.findOne({ email: decoded.email });
        if (!user) return res.status(401).json({ error: "User not found" });
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid Token" });
    }
};

// Middleware to check project access
const checkAccess = (roleRequired: string[] = ['viewer', 'writer', 'admin', 'host']) => {
    return async (req: any, res: any, next: any) => {
        const projectIdStr = req.params.projectId;
        // Project ID might be the ROOM ID string, not _id
        // Let's resolve project first
        try {
            const project = await Project.findOne({ roomId: projectIdStr });
            if (!project) return res.status(404).json({ error: "Project not found" });
            req.project = project;

            // Host is owner
            if (project.ownerId.toString() === req.user._id.toString()) {
                req.role = 'host';
                return next();
            }

            // Check access by userId first
            let access = await Access.findOne({ 
                projectId: project._id as any, 
                userId: req.user._id as any,
                isDeleted: false 
            });
            
            // If no access by userId, check by email (for invited users)
            if (!access && req.user.email) {
                access = await Access.findOne({ 
                    projectId: project._id as any, 
                    invitedEmail: req.user.email,
                    isDeleted: false 
                });
                
                // If found by email but userId is not set, update it now that user has logged in
                if (access && !access.userId) {
                    access.userId = req.user._id;
                    await access.save();
                }
            }
            
            if (!access) {
                return res.status(403).json({ 
                    error: "You have no access for this room. Please contact the author of the room or create a room with a different name.",
                    code: "NO_ACCESS"
                });
            }

            if (!roleRequired.includes(access.role)) {
                return res.status(403).json({ error: "Insufficient Permissions" });
            }
            req.role = access.role;
            next();
        } catch (e) {
            res.status(500).json({ error: "Access Check Failed" });
        }
    };
};

// GET Graph Data
router.get('/:projectId', authenticate, checkAccess(['viewer', 'writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const projectId = req.project._id;

        const nodes = await Node.find({ projectId, isDeleted: false });
        const edges = await Edge.find({ projectId, isDeleted: false });
        const comments = await Comment.find({ projectId, isDeleted: false });
        
        // Transform to FE shape (clean _id?)
        // FE expects 'id' (uuid), not _id (mongo). 
        // Models have nodeId/edgeId/commentId.
        
        const cleanNodes = nodes.map(n => ({ ...n.toObject(), id: n.nodeId, _id: undefined }));
        const cleanEdges = edges.map(e => ({ ...e.toObject(), id: e.edgeId, _id: undefined }));
        const cleanComments = comments.map(c => ({ ...c.toObject(), id: c.commentId, _id: undefined }));

        const history = await History.find({ projectId }).sort({ timestamp: -1 }).limit(50);

        res.json({
            nodes: cleanNodes,
            edges: cleanEdges,
            comments: cleanComments,
            project: {
                name: req.project.name,
                role: req.role,
                backgroundColor: req.project.backgroundColor,
                config: req.project.config
            },
            history: history.map(h => ({
                id: h._id,
                action: h.action,
                details: h.details,
                author: h.authorId,
                timestamp: h.timestamp,
                entityType: h.entityType,
                entityId: h.entityId,
                canRevert: !!h.previousState || h.action.includes('Create') || h.action.includes('Add')
            }))
        });
    } catch (e) {
        res.status(500).json({ error: "Fetch Failed" });
    }
});

// UPSERT Node
router.put('/:projectId/node', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { id, title, description, color, x, y, docLink, props } = req.body;
        
        // Find existing to snapshot for history
        const existing = await Node.findOne({ projectId: req.project._id, nodeId: id });
        
        let action = 'Add Node';
        let details = `Node ${title || id} created`;
        let previousState: any = null;
        let newState: any = { title, description, color, x, y, docLink, props };

        if (existing) {
            if (existing.isDeleted) {
                action = 'Restore Node';
                details = `Node ${title || id} restored`;
                previousState = existing.toObject();
            } else {
                action = 'Update Node';
                const diff = calculateNodeDiff(existing.toObject(), req.body);
                if (Object.keys(diff.changes).length === 0) {
                     await Node.findOneAndUpdate({ projectId: req.project._id, nodeId: id }, { updatedAt: new Date() });
                     return res.json({ success: true });
                }
                details = diff.detailsString || `Node ${title || id} updated`;
                previousState = diff.changes;
                
                // Partial new state
                newState = {};
                Object.keys(diff.changes).forEach(k => newState[k] = req.body[k]);
            }
        }
        
        const node = await Node.findOneAndUpdate(
            { projectId: req.project._id, nodeId: id },
            { 
                title, description, color, x, y, docLink, props,
                isDeleted: false,
                updatedAt: new Date(),
                $setOnInsert: { createdBy: req.user._id }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const h = await History.create({
            projectId: req.project._id,
            action,
            details,
            authorId: req.user.name,
            entityType: 'node',
            entityId: id,
            previousState,
            newState
        });

        // Emit Socket Event
        const roomId = req.params.projectId;
        getIO().to(roomId).emit('node:update', { ...node.toObject(), id: node.nodeId });
        
        getIO().to(roomId).emit('history:add', {
            id: h._id,
            action: h.action,
            details: h.details,
            author: h.authorId,
            timestamp: h.timestamp,
            entityType: h.entityType,
            entityId: h.entityId,
            canRevert: !!h.previousState || h.action.includes('Create') || h.action.includes('Add')
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Update Node Failed" });
    }
});

// DELETE Node (Soft)
router.delete('/:projectId/node/:nodeId', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { nodeId } = req.params;
        const node = await Node.findOne({ projectId: req.project._id, nodeId });
        
        if (node) {
            node.isDeleted = true;
            node.deletedAt = new Date();
            await node.save();
            
            const h = await History.create({
                projectId: req.project._id,
                action: 'Delete Node',
                details: `Node ${node.title || nodeId} deleted`,
                authorId: req.user.name,
                entityType: 'node',
                entityId: nodeId,
                previousState: node.toObject()
            });
            
            // Emit Socket Event
            getIO().to(req.params.projectId).emit('node:delete', { id: nodeId });
            
            getIO().to(req.params.projectId).emit('history:add', {
                id: h._id,
                action: h.action,
                details: h.details,
                author: h.authorId,
                timestamp: h.timestamp,
                entityType: h.entityType,
                entityId: h.entityId,
                canRevert: true
            });
        }
        res.json({ success: true });
    } catch (e) {
         res.status(500).json({ error: "Delete Failed" });
    }
});

// Same for Edge
router.put('/:projectId/edge', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
     try {
        const { id, source, target, label, sourceProp, targetProp } = req.body;
        
        const existing = await Edge.findOne({ projectId: req.project._id, edgeId: id });
        
        let action = 'Add Edge';
        let details = `Edge ${id} added`;
        let previousState: any = null;
        let newState: any = { source, target, label, sourceProp, targetProp };

        if (existing) {
             action = 'Update Edge';
             // Diff
             const changes: any = {};
             const diffs: string[] = [];
             const oldObj = existing.toObject();
             
             if (oldObj.label !== label) { changes.label = oldObj.label; diffs.push('Label updated'); }
             // Compare IDs for source/target if they are strings
             if (oldObj.source !== source) { changes.source = oldObj.source; diffs.push('Source changed'); }
             if (oldObj.target !== target) { changes.target = oldObj.target; diffs.push('Target changed'); }
             if (oldObj.sourceProp !== sourceProp) { changes.sourceProp = oldObj.sourceProp; diffs.push('Source connect updated'); }
             if (oldObj.targetProp !== targetProp) { changes.targetProp = oldObj.targetProp; diffs.push('Target connect updated'); }

             if (Object.keys(changes).length === 0) {
                 await Edge.findOneAndUpdate({ projectId: req.project._id, edgeId: id }, { updatedAt: new Date() });
                 return res.json({ success: true });
             }
             
             details = diffs.join(', ') || `Edge ${id} updated`;
             previousState = changes;
             
             newState = {};
             Object.keys(changes).forEach(k => newState[k] = req.body[k]);
        }
        
        const edge = await Edge.findOneAndUpdate(
            { projectId: req.project._id, edgeId: id },
            { 
                source, target, label, sourceProp, targetProp,
                isDeleted: false,
                updatedAt: new Date(),
                $setOnInsert: { createdBy: req.user._id }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const h = await History.create({
            projectId: req.project._id,
            action,
            details,
            authorId: req.user.name,
            entityType: 'edge',
            entityId: id,
            previousState,
            newState
        });
        
        // Emit Socket Event
        getIO().to(req.params.projectId).emit('edge:update', { ...edge.toObject(), id: edge.edgeId });

        getIO().to(req.params.projectId).emit('history:add', {
            id: h._id,
            action: h.action,
            details: h.details,
            author: h.authorId,
            timestamp: h.timestamp,
            entityType: h.entityType,
            entityId: h.entityId,
            canRevert: !!h.previousState || h.action.includes('Add')
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Update Edge Failed" });
    }
});

router.delete('/:projectId/edge/:edgeId', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { edgeId } = req.params;
        const edge = await Edge.findOne({ projectId: req.project._id, edgeId });
        if(edge) {
            edge.isDeleted = true;
            edge.deletedAt = new Date();
            await edge.save();
            const h = await History.create({
                projectId: req.project._id,
                action: 'Delete Edge',
                details: `Edge ${edgeId} deleted`,
                authorId: req.user.name,
                entityType: 'edge',
                entityId: edgeId,
                previousState: edge.toObject()
            });

            // Emit Socket Event
            getIO().to(req.params.projectId).emit('edge:delete', { id: edgeId });

            getIO().to(req.params.projectId).emit('history:add', {
                id: h._id,
                action: h.action,
                details: h.details,
                author: h.authorId,
                timestamp: h.timestamp,
                entityType: h.entityType,
                entityId: h.entityId,
                canRevert: true
            });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Delete Edge Failed" }); }
});

// Comment Ops
router.put('/:projectId/comment', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
     try {
        const { id, text, x, y, color } = req.body;
        const comment = await Comment.findOneAndUpdate(
            { projectId: req.project._id, commentId: id },
            { 
                text, x, y, color, authorId: req.user.name, // or ID
                isDeleted: false,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        getIO().to(req.params.projectId).emit('comment:update', { ...comment.toObject(), id: comment.commentId });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Comment Failed" }); }
});

router.delete('/:projectId/comment/:commentId', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        await Comment.findOneAndUpdate(
            { projectId: req.project._id, commentId: req.params.commentId },
            { isDeleted: true, deletedAt: new Date() }
        );
        getIO().to(req.params.projectId).emit('comment:delete', { id: req.params.commentId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Delete Comment Failed" }); }
});

// History
router.get('/:projectId/history', authenticate, checkAccess(['viewer']), async (req: any, res) => {
    try {
        const history = await History.find({ projectId: req.project._id })
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(history);
    } catch(e) { res.status(500).json({ error: "History Fetch Failed" }); }
});

// Initialize / Create Project (Room)
router.post('/init', authenticate, async (req: any, res) => {
    try {
        const { roomId, name, config } = req.body;
        
        let project = await Project.findOne({ roomId });
        if (!project) {
            // Check if a project with the same name already exists
            const existingProjectWithName = await Project.findOne({ 
                name: name || `Project ${roomId}`,
                isDeleted: false 
            });

            if (existingProjectWithName) {
                return res.status(409).json({ 
                    error: "You have no access for this room. Please contact the author of the room or create a room with a different name.",
                    code: "ROOM_NAME_EXISTS"
                });
            }

            project = await Project.create({
                roomId,
                name: name || `Project ${roomId}`,
                ownerId: req.user._id,
                config
            });
        }
        
        // Ensure owner has access (implicit via schema logic but robust to add)
        // Actually checkAccess uses ownerId field so we are good.

        res.json({ success: true, project });
    } catch(e) { 
        const err = e as Error;
        res.status(500).json({ error: err.message || "Init Failed" }); 
    }
});

// Bulk Sync (for migration or full save)
router.post('/:projectId/sync', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { nodes, edges, comments, config } = req.body;
        const projectId = req.project._id;
        const replace = req.query.replace === 'true';

        if (replace) {
             await Node.updateMany({ projectId }, { isDeleted: true });
             await Edge.updateMany({ projectId }, { isDeleted: true });
             await Comment.updateMany({ projectId }, { isDeleted: true });
        }
        
        // Update Config if provided
        if (config) {
            await Project.findByIdAndUpdate(projectId, { 
                $set: { config: config } 
            });
        }
        
        const bulkOps = [];
        
        if (nodes) {
            for (const n of nodes) {
                bulkOps.push({
                    updateOne: {
                        filter: { projectId, nodeId: n.id },
                        update: { 
                            $set: { 
                                title: n.title, 
                                description: n.description,
                                color: n.color,
                                x: n.x, y: n.y,
                                docLink: n.docLink,
                                props: n.props,
                                isDeleted: false, // Revive if deleted
                                updatedAt: new Date()
                            },
                            $setOnInsert: { createdBy: req.user._id }
                        },
                        upsert: true
                    }
                });
            }
        }
        if (bulkOps.length > 0) await Node.bulkWrite(bulkOps as any);

        const edgeOps = [];
        if (edges) {
            for (const e of edges) {
                edgeOps.push({
                    updateOne: {
                        filter: { projectId, edgeId: e.id },
                        update: { 
                            $set: { 
                                source: typeof e.source === 'object' ? e.source.id : e.source, 
                                target: typeof e.target === 'object' ? e.target.id : e.target,
                                label: e.label,
                                sourceProp: e.sourceProp,
                                targetProp: e.targetProp,
                                isDeleted: false,
                                updatedAt: new Date()
                            },
                             $setOnInsert: { createdBy: req.user._id }
                        },
                        upsert: true
                    }
                });
            }
        }
        if (edgeOps.length > 0) await Edge.bulkWrite(edgeOps as any);

        const commentOps = [];
        if (comments) {
             for (const c of comments) {
                commentOps.push({
                    updateOne: {
                        filter: { projectId, commentId: c.id },
                        update: { 
                            $set: { 
                                text: c.text, x: c.x, y: c.y, color: c.color, authorId: c.authorId || req.user.name,
                                isDeleted: false,
                                updatedAt: new Date()
                            }
                        },
                        upsert: true
                    }
                });
            }
        }
        if (commentOps.length > 0) await Comment.bulkWrite(commentOps as any);

        const h = await History.create({
             projectId,
             action: replace ? 'Import JSON' : 'Bulk Sync',
             details: replace ? `Restored from backup: ${nodes?.length || 0} nodes` : `Synced ${nodes?.length || 0} nodes`,
             authorId: req.user.name,
             timestamp: new Date()
        });

        getIO().to(projectId).emit('history:add', {
            id: h._id,
            action: h.action,
            details: h.details,
            author: h.authorId,
            timestamp: h.timestamp,
            canRevert: false
        });

        res.json({ success: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: "Bulk Sync Failed" });
    }
});

// Update Project Background
router.put('/:projectId/background', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { color } = req.body;
        req.project.backgroundColor = color;
        await req.project.save();
        
        const h = await History.create({
            projectId: req.project._id,
            action: 'Update Background',
            details: `Project background changed to ${color}`,
            authorId: req.user.name,
            timestamp: new Date()
        });

        getIO().to(req.params.projectId).emit('project:settings', { backgroundColor: color });
        
        getIO().to(req.params.projectId).emit('history:add', {
            id: h._id,
            action: h.action,
            details: h.details,
            author: h.authorId,
            timestamp: h.timestamp
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Update Failed" });
    }
});


// DELETE Project (Soft)
router.delete('/:projectId', authenticate, checkAccess(['host']), async (req: any, res) => {
    try {
        const project = req.project;
        project.isDeleted = true;
        await project.save();
        
        // Soft delete all children
        const projectId = project._id;
        await Node.updateMany({ projectId }, { isDeleted: true, deletedAt: new Date() });
        await Edge.updateMany({ projectId }, { isDeleted: true, deletedAt: new Date() });
        await Comment.updateMany({ projectId }, { isDeleted: true, deletedAt: new Date() });
        
        getIO().to(project.roomId).emit('room:deleted');
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete Project Failed" });
    }
});

// REVERT History Item
router.post('/:projectId/history/:historyId/revert', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        const { historyId } = req.params;
        const item = await History.findById(historyId);
        if (!item || item.projectId.toString() !== req.project._id.toString()) {
            return res.status(404).json({ error: "History item not found" });
        }

        let reverted = false;

        if (item.entityType === 'node' && item.entityId) {
            if (item.action.includes('Delete') || item.action.includes('Update') || item.action === 'Restore Node' || item.previousState) {
                if (item.previousState) {
                    const p = { ...item.previousState };
                    delete p._id; 
                    
                    await Node.findOneAndUpdate(
                        { projectId: req.project._id, nodeId: item.entityId },
                        { 
                            $set: { ...p, isDeleted: false, updatedAt: new Date() }
                        },
                        { upsert: true }
                    );
                    
                    const updatedNode = await Node.findOne({ projectId: req.project._id, nodeId: item.entityId });
                    getIO().to(req.params.projectId).emit('node:update', { ...updatedNode?.toObject(), id: item.entityId });
                    reverted = true;
                }
            } else if (item.action.includes('Add') || item.action.includes('Create')) {
                 await Node.findOneAndUpdate(
                    { projectId: req.project._id, nodeId: item.entityId },
                    { isDeleted: true, updatedAt: new Date() }
                );
                getIO().to(req.params.projectId).emit('node:delete', { id: item.entityId });
                reverted = true;
            }
        } 
        else if (item.entityType === 'edge' && item.entityId) {
             if (item.previousState) {
                const p = { ...item.previousState };
                delete p._id;

                await Edge.findOneAndUpdate(
                    { projectId: req.project._id, edgeId: item.entityId },
                    { 
                        $set: { ...p, isDeleted: false, updatedAt: new Date() }
                    },
                    { upsert: true }
                );
                
                const updatedEdge = await Edge.findOne({ projectId: req.project._id, edgeId: item.entityId });
                getIO().to(req.params.projectId).emit('edge:update', { ...updatedEdge?.toObject(), id: item.entityId });
                reverted = true;
             } else if (item.action.includes('Add')) {
                 await Edge.findOneAndUpdate(
                    { projectId: req.project._id, edgeId: item.entityId },
                    { isDeleted: true }
                );
                getIO().to(req.params.projectId).emit('edge:delete', { id: item.entityId });
                reverted = true;
             }
        }

        if (reverted) {
            const h = await History.create({
                projectId: req.project._id,
                action: `Revert: ${item.action}`,
                details: `Reverted change from ${item.timestamp.toISOString()}`,
                authorId: req.user.name,
                timestamp: new Date()
            });
            
            getIO().to(req.params.projectId).emit('history:add', {
                id: h._id,
                action: h.action,
                details: h.details,
                author: h.authorId,
                timestamp: h.timestamp
            });

            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Cannot revert this item (missing state)" });
        }
    } catch (e) {
        console.error("Revert Failed", e);
        res.status(500).json({ error: "Revert Failed" });
    }
});

// DELETE History (Clear All)
router.delete('/:projectId/history', authenticate, checkAccess(['writer', 'admin', 'host']), async (req: any, res) => {
    try {
        console.log(`Clearing history for project: ${req.project._id} (Room: ${req.params.projectId})`);
        const result = await History.deleteMany({ projectId: req.project._id });
        console.log(`Deleted ${result.deletedCount} history items.`);
        
        // Emit event to clear history on all clients
        getIO().to(req.params.projectId).emit('history:clear');
        res.json({ success: true, count: result.deletedCount });
    } catch (e) {
        console.error("Clear History Failed", e);
        res.status(500).json({ error: "Failed to clear history" });
    }
});

// GET Room Access Management - Fetch users with access to this room
router.get('/:projectId/access', authenticate, checkAccess(['host']), async (req: any, res) => {
    try {
        const projectId = req.project._id;

        // Get all access records (both deleted and active)
        const accessList = await Access.find({ projectId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        // Format response
        const users = accessList.map(access => ({
            id: access._id,
            userId: access.userId,
            name: (access.userId as any)?.name || 'Unknown',
            email: (access.userId as any)?.email || access.invitedEmail || 'Unknown',
            role: access.role,
            isVisible: access.isVisible,
            isDeleted: access.isDeleted,
            invitedEmail: access.invitedEmail,
            createdAt: access.createdAt
        }));

        res.json({ success: true, users });
    } catch (e) {
        console.error("Failed to fetch access list", e);
        res.status(500).json({ error: "Failed to fetch access list" });
    }
});

// DELETE User from Room Access - Soft delete by access ID
router.delete('/:projectId/access/:accessId', authenticate, checkAccess(['host']), async (req: any, res) => {
    try {
        const { projectId, accessId } = req.params;
        const project = req.project;

        // Verify this access record belongs to this project
        const access = await Access.findOne({ _id: accessId, projectId: project._id });
        if (!access) {
            return res.status(404).json({ error: "Access record not found" });
        }

        // Cannot remove the host/owner
        if (access.role === 'host' || project.ownerId.toString() === access.userId?.toString()) {
            return res.status(403).json({ error: "Cannot remove project owner" });
        }

        // Soft delete the access record
        await Access.findByIdAndUpdate(accessId, { isDeleted: true, updatedAt: new Date() });

        // Notify other users in the room
        getIO().to(req.params.projectId).emit('user:removed', {
            accessId,
            message: `User removed from project`
        });

        res.json({ success: true, message: "User removed from project" });
    } catch (e) {
        console.error("Failed to remove user from access", e);
        res.status(500).json({ error: "Failed to remove user" });
    }
});

export default router;

