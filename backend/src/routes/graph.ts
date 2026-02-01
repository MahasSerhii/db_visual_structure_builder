import { Router } from 'express';
import { authenticate, checkAccess } from '../middleware/authMiddleware';
import * as graphController from '../controllers/graphController';
import * as historyController from '../controllers/historyController';
import * as accessController from '../controllers/accessController';
import * as projectController from '../controllers/projectController';

const router = Router();

// Initialization & Global
router.post('/init', authenticate, projectController.createProject);
router.post('/clear-room', authenticate, graphController.clearGraph);

// Graph Data
router.get('/:projectId', authenticate, checkAccess(['Viewer', 'Editor', 'Admin', 'host']), graphController.getGraph);
router.post('/:projectId/sync', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.syncGraph);

// Nodes
router.post('/:projectId/node', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.addNode);
router.put('/:projectId/node/:nodeId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.updateNode);
router.delete('/:projectId/node/:nodeId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.deleteNode);

// Edges
router.post('/:projectId/edge', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.addEdge);
router.put('/:projectId/edge/:edgeId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.updateEdge);
router.delete('/:projectId/edge/:edgeId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.deleteEdge);

// Comments
router.post('/:projectId/comment', authenticate, checkAccess(['Viewer', 'Editor', 'Admin', 'host']), graphController.addComment);
router.put('/:projectId/comment/:commentId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.updateComment); 
router.delete('/:projectId/comment/:commentId', authenticate, checkAccess(['Editor', 'Admin', 'host']), graphController.deleteComment);

// History
router.get('/:projectId/history', authenticate, checkAccess(['Viewer', 'Editor', 'Admin', 'host']), historyController.getHistory);
router.post('/:projectId/history/:historyId/revert', authenticate, checkAccess(['Editor', 'Admin', 'host']), historyController.revertHistory);
router.delete('/:projectId/history', authenticate, checkAccess(['Editor', 'Admin', 'host']), historyController.clearHistory);

// Access
router.get('/:projectId/access', authenticate, checkAccess(['host', 'Editor', 'Viewer']), accessController.getAccessList);
router.put('/:projectId/access', authenticate, checkAccess(['host', 'Admin', 'Editor']), accessController.updateAccessRole);
router.delete('/:projectId/access/:targetUserId', authenticate, checkAccess(['host', 'Admin', 'Editor']), accessController.removeAccess);

// Project
router.delete('/:roomId', authenticate, checkAccess(['host', 'Admin']), projectController.deleteProject);
router.put('/:projectId/background', authenticate, checkAccess(['Editor', 'Admin', 'host']), projectController.updateProjectBackground);
router.put('/:projectId/config', authenticate, checkAccess(['Editor', 'Admin', 'host']), projectController.updateProjectConfig);

export default router;

