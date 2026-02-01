import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/invite', authenticate, authController.inviteUser);
router.get('/validate-invite', authController.validateInvite);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/social-login', authController.socialLogin);
router.post('/request-reset-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-access', authController.verifyAccess);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/user', authenticate, authController.getUser);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
