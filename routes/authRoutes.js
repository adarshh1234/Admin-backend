import express from 'express';
import authController from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

// Public Authentication Portals
router.post('/login', authController.loginUnified);
router.post('/super-admin/login', authController.loginSuperAdmin);
router.post('/admin/login', authController.loginAdmin);
router.post('/logout', authController.logout);

// Protected Authentication Endpoints
router.get('/me', verifyAuth, authController.getMe);
router.get('/users', verifyAuth, authController.getUsers);

export default router;
