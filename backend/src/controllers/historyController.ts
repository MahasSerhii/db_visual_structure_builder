import { Response } from 'express';
import History, { IHistory } from '../models/History';
import Node from '../models/Node';
import Edge from '../models/Edge';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../socket';
import { catchAsync } from '../middleware/errorMiddleware';
import { NotFoundException, BadRequestException, InternalServerException, UnauthorizedException } from '../exceptions/HttpExceptions';
import { t } from '../utils/i18n';

export const revertHistory = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project || !req.user) throw new UnauthorizedException(t(req.user?.language, "error.history.context_missing"));
    const { historyId } = req.params;
    const item = await History.findById(historyId);

    if (!item || item.projectId.toString() !== req.project._id.toString()) {
        throw new NotFoundException(t(req.user?.language, "error.history.not_found"));
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
                    getIO().to(req.project!._id.toString()).emit('node:update', { ...updatedNodeObj, id: item.entityId });
                }
                reverted = true;
            }
        } else if (item.action.includes('Add')) {
                await Node.findOneAndUpdate(
                { projectId: req.project._id, nodeId: item.entityId },
                { isDeleted: true, updatedAt: new Date() }
            );
            getIO().to(req.project!._id.toString()).emit('node:delete', { id: item.entityId });
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
                getIO().to(req.project!._id.toString()).emit('edge:update', { ...updatedEdgeObj, id: item.entityId });
            }
            reverted = true;
            } else if (item.action.includes('Add')) {
                await Edge.findOneAndUpdate(
                { projectId: req.project._id, edgeId: item.entityId },
                { isDeleted: true }
            );
            getIO().to(req.project!._id.toString()).emit('edge:delete', { id: item.entityId });
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
        
        getIO().to(req.project!._id.toString()).emit('history:add', {
            id: h._id,
            action: h.action,
            details: h.details,
            author: h.authorId,
            timestamp: h.timestamp
        });

        res.json({ success: true });
    } else {
        throw new BadRequestException(t(req.user?.language, "error.history.revert_failed_state"));
    }
});

export const getHistory = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project) throw new UnauthorizedException(t(req.user?.language, "error.history.context_missing"));
    const history = await History.find({ projectId: req.project._id })
        .sort({ timestamp: -1 })
        .limit(100);

    res.json(history);
});

export const clearHistory = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.project) throw new UnauthorizedException(t(req.user?.language, "error.history.context_missing"));
    const result = await History.deleteMany({ projectId: req.project._id });
    getIO().to(req.project._id.toString()).emit('history:clear');
    res.json({ success: true, count: result.deletedCount });
});
