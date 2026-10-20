import { Router } from 'express';
import { platformUsersController } from '../controllers/platformUsersController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

// Aggregated Platform Stats
router.get('/stats', requireAdminAuth, platformUsersController.getPlatformStats);

// Candidates
router.get('/candidates', requireAdminAuth, platformUsersController.getCandidates);
router.get('/candidates/stats', requireAdminAuth, platformUsersController.getCandidateStats);
router.patch('/candidates/:id/status', requireAdminAuth, platformUsersController.updateCandidateStatus);
router.put('/candidates/:id', requireAdminAuth, platformUsersController.updateCandidateStatus);
router.delete('/candidates/:id', requireAdminAuth, platformUsersController.deleteCandidate);

// Startups
router.get('/startups', requireAdminAuth, platformUsersController.getStartups);
router.get('/startups/stats', requireAdminAuth, platformUsersController.getStartupStats);
router.patch('/startups/:id/status', requireAdminAuth, platformUsersController.updateStartupStatus);
router.put('/startups/:id', requireAdminAuth, platformUsersController.updateStartupStatus);
router.delete('/startups/:id', requireAdminAuth, platformUsersController.deleteStartup);

// Companies
router.get('/companies', requireAdminAuth, platformUsersController.getCompanies);
router.get('/companies/stats', requireAdminAuth, platformUsersController.getCompanyStats);
router.patch('/companies/:id/status', requireAdminAuth, platformUsersController.updateCompanyStatus);
router.put('/companies/:id', requireAdminAuth, platformUsersController.updateCompanyStatus);
router.delete('/companies/:id', requireAdminAuth, platformUsersController.deleteCompany);

// Institutions
router.get('/institutions', requireAdminAuth, platformUsersController.getInstitutions);
router.get('/institutions/stats', requireAdminAuth, platformUsersController.getInstitutionStats);
router.patch('/institutions/:id/status', requireAdminAuth, platformUsersController.updateInstitutionStatus);
router.put('/institutions/:id', requireAdminAuth, platformUsersController.updateInstitutionStatus);
router.delete('/institutions/:id', requireAdminAuth, platformUsersController.deleteInstitution);

export default router;
