import { Router } from 'express';
import { authenticate, checkAccess } from '../middleware/authMiddleware';
import * as graphController from '../controllers/graphController';
import * as historyController from '../controllers/historyController';
import * as accessController from '../controllers/accessController';
import * as projectController from '../controllers/projectController';
import { UserRole } from '../types/enums';

const router = Router();

// Initialization & Global
router.post('/init', authenticate, projectController.createProject);
router.post('/clear-room', authenticate, graphController.clearGraph);

// Graph Data
router.get('/:projectId', authenticate, checkAccess([UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN]), graphController.getGraph);
router.post('/:projectId/sync', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.syncGraph);

// Nodes
router.post('/:projectId/node', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.addNode);
router.put('/:projectId/node/:nodeId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.updateNode);
router.delete('/:projectId/node/:nodeId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.deleteNode);

// Edges
router.post('/:projectId/edge', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.addEdge);
router.put('/:projectId/edge/:edgeId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.updateEdge);
router.delete('/:projectId/edge/:edgeId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.deleteEdge);

// Comments
router.post('/:projectId/comment', authenticate, checkAccess([UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN]), graphController.addComment);
router.put('/:projectId/comment/:commentId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.updateComment); 
router.delete('/:projectId/comment/:commentId', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), graphController.deleteComment);

// History
router.get('/:projectId/history', authenticate, checkAccess([UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN]), historyController.getHistory);
router.post('/:projectId/history/:historyId/revert', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), historyController.revertHistory);
router.delete('/:projectId/history', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), historyController.clearHistory);

// Access
// Assuming Admin should also see access list
router.get('/:projectId/access', authenticate, checkAccess([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]), accessController.getAccessList);
router.put('/:projectId/access', authenticate, checkAccess([UserRole.ADMIN, UserRole.EDITOR]), accessController.updateAccessRole);
router.delete('/:projectId/access/:targetUserId', authenticate, checkAccess([UserRole.ADMIN, UserRole.EDITOR]), accessController.removeAccess);

// Project
router.delete('/:roomId', authenticate, checkAccess([UserRole.ADMIN]), projectController.deleteProject);
router.put('/:projectId/background', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), projectController.updateProjectBackground);
router.put('/:projectId/config', authenticate, checkAccess([UserRole.EDITOR, UserRole.ADMIN]), projectController.updateProjectConfig);

export default router;

