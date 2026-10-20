import express from 'express';
import userController from '../controllers/userController.js';
import { requireAdminOrSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All user management routes require valid Admin or Super Admin authentication
router.get('/', requireAdminOrSuperAdmin, userController.getUsers);
router.get('/stats', requireAdminOrSuperAdmin, userController.getUserStats);
router.post('/', requireAdminOrSuperAdmin, userController.createUser);
router.put('/:id', requireAdminOrSuperAdmin, userController.updateUser);
router.post('/:id/reset-password', requireAdminOrSuperAdmin, userController.resetPassword);
router.patch('/:id/status', requireAdminOrSuperAdmin, userController.toggleStatus);
router.delete('/:id', requireAdminOrSuperAdmin, userController.deleteUser);

export default router;
