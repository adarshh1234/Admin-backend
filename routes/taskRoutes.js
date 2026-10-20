import express from 'express';
import taskController from '../controllers/taskController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Public / Authenticated Read
router.get('/tasks', taskController.getTasks);
router.get('/tasks/:id', taskController.getTask);
router.get('/tasks/:id/activities', taskController.getActivities);
router.get('/tasks/:taskId/comments', taskController.getComments);
router.get('/tasks/:taskId/subscribers', taskController.getSubscribers);
router.get('/tags', taskController.getTags);
router.get('/tasks/:taskId/tags', taskController.getTaskTags);

// Authenticated Write
router.post('/tasks', requireAdminAuth, taskController.createTask);
router.patch('/tasks/:id', requireAdminAuth, taskController.updateTask);
router.delete('/tasks/:id', requireAdminAuth, taskController.deleteTask);

// Comments
router.post('/tasks/:taskId/comments', requireAdminAuth, taskController.createComment);
router.delete('/tasks/:taskId/comments/:commentId', requireAdminAuth, taskController.deleteComment);

// Subscribers
router.post('/tasks/:taskId/subscribers', requireAdminAuth, taskController.addSubscriber);
router.delete('/tasks/:taskId/subscribers/:userId', requireAdminAuth, taskController.removeSubscriber);

// Tags
router.post('/tags', requireAdminAuth, taskController.createTag);
router.post('/tasks/:taskId/tags', requireAdminAuth, taskController.addTagToTask);
router.delete('/tasks/:taskId/tags/:tagId', requireAdminAuth, taskController.removeTagFromTask);

export default router;
