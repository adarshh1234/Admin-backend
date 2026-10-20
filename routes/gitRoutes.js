import express from 'express';
import repositoryController from '../controllers/repositoryController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Repositories Read
router.get('/repositories', repositoryController.getRepositories);
router.get('/repositories/:slug', repositoryController.getRepository);
router.get('/repositories/:slug/branches', repositoryController.getBranches);
router.get('/repositories/:slug/commits', repositoryController.getCommits);
router.get('/repositories/:slug/commits/:hash', repositoryController.getCommit);
router.get('/repositories/:slug/commits/:hash/diff', repositoryController.getCommitDiff);
router.get('/repositories/:slug/tree', repositoryController.getTree);
router.get('/repositories/:slug/blob', repositoryController.getBlob);

// Repositories Write
router.post('/repositories', requireAdminAuth, repositoryController.createRepository);
router.patch('/repositories/:slug', requireAdminAuth, repositoryController.updateRepository);

// Repository Members
router.get('/repositories/:slug/members', requireAdminAuth, repositoryController.getMembers);
router.post('/repositories/:slug/members', requireAdminAuth, repositoryController.addMember);
router.patch('/repositories/:slug/members/:userId', requireAdminAuth, repositoryController.updateMember);
router.delete('/repositories/:slug/members/:userId', requireAdminAuth, repositoryController.removeMember);

// Git Tokens
router.get('/auth/git-tokens', requireAdminAuth, repositoryController.getTokens);
router.post('/auth/git-tokens', requireAdminAuth, repositoryController.createToken);
router.delete('/auth/git-tokens/:id', requireAdminAuth, repositoryController.revokeToken);

export default router;
