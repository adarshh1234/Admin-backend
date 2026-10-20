import express from 'express';
import { misController } from '../controllers/misController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * MIS Dashboard Routes
 * Provides comprehensive real-time business and platform analytics.
 */
router.get('/overview', requireAdminAuth, misController.getOverview);
router.get('/dashboard', requireAdminAuth, misController.getOverview);

// Also expose public read fallback for embedded preview if requested without token
router.get('/public-summary', misController.getOverview);

export default router;
