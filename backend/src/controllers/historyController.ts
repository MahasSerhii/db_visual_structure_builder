import { Response } from 'express';
import History, { IHistory } from '../models/History';
import Node from '../models/Node';
import Edge from '../models/Edge';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../socket';

export const revertHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project || !req.user) return res.status(401).json({ error: "Context missing" });
        const { historyId } = req.params;
        const item = await History.findById(historyId);

        if (!item || item.projectId.toString() !== req.project._id.toString()) {
            return res.status(404).json({ error: "History item not found" });
        }

        let reverted = false;

        if (item.entityType === 'node' && item.entityId) {
            if (item.action.includes('Delete') || item.action.includes('Update') || item.previousState) {
                if (item.previousState) {
                    const p: any = { ...item.previousState };
                    if ('_id' in p) delete p['_id']; 
                    
                    await Node.findOneAndUpdate(
                        { projectId: req.project._id, nodeId: item.entityId },
                        { $set: { ...p, isDeleted: false, updatedAt: new Date() } },
                        { upsert: true }
                    );
                    
                    const updatedNode = await Node.findOne({ projectId: req.project._id, nodeId: item.entityId });
                    const updatedNodeObj = updatedNode && (updatedNode.toObject ? updatedNode.toObject() : updatedNode);
                    if (updatedNodeObj) {
                        getIO().to(req.params.projectId).emit('node:update', { ...updatedNodeObj, id: item.entityId });
                    }
                    reverted = true;
                }
            } else if (item.action.includes('Add')) {
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
                const p: any = { ...item.previousState };
                if ('_id' in p) delete p['_id'];

                await Edge.findOneAndUpdate(
                    { projectId: req.project._id, edgeId: item.entityId },
                    { $set: { ...p, isDeleted: false, updatedAt: new Date() } },
                    { upsert: true }
                );
                
                const updatedEdge = await Edge.findOne({ projectId: req.project._id, edgeId: item.entityId });
                const updatedEdgeObj = updatedEdge && (updatedEdge.toObject ? updatedEdge.toObject() : updatedEdge);

                if (updatedEdgeObj) {
                    getIO().to(req.params.projectId).emit('edge:update', { ...updatedEdgeObj, id: item.entityId });
                }
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
            const h = (await History.create({
                projectId: req.project._id,
                action: `Revert: ${item.action}`,
                details: `Reverted change from ${item.timestamp.toISOString()}`,
                authorId: req.user.name,
                timestamp: new Date()
            })) as IHistory;
            
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
    } catch (e: unknown) {
        console.error("Revert Failed", e);
        res.status(500).json({ error: "Revert Failed" });
    }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project) return res.status(401).json({ error: "Context missing" });
        const history = await History.find({ projectId: req.project._id })
            .sort({ timestamp: -1 })
            .limit(100);

        res.json(history);
    } catch { res.status(500).json({ error: "History Fetch Failed" }); }
};

export const clearHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.project) return res.status(401).json({ error: "Context missing" });
        const result = await History.deleteMany({ projectId: req.project._id });
        getIO().to(req.params.projectId).emit('history:clear');
        res.json({ success: true, count: result.deletedCount });
    } catch (e) {
        res.status(500).json({ error: "Failed to clear history" });
    }
};
