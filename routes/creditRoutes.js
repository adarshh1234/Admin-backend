import { Router } from 'express';
import { creditController } from '../controllers/creditController.js';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// All credit management routes require authenticated Admin or Super Admin privileges
router.use(requireAdminOrSuperAdmin);

// Account Queries by Category (Customers, Company, Institution, Startups)
router.get('/accounts', creditController.getAccounts);

// Account Details, Balances, Subscriptions & Transactions
router.get('/accounts/:id', creditController.getAccountDetails);

// Manual Credit Adjustment (Add or Deduct Credits with Validation & Audit)
router.post('/accounts/:id/adjust', creditController.adjustBalance);

// Pricing Configuration & CMS Publishing Workflow
router.get('/pricing', creditController.getPricingConfig);
router.get('/pricing/category/:category', creditController.getCategoryPricing);
router.post('/pricing/save-draft', creditController.savePricingDraft);
router.post('/pricing/publish', creditController.publishPricing);
router.post('/pricing/reset', creditController.resetPricing);
router.put('/pricing', creditController.updatePricingConfig);

// Global Payment & Credits Kill Switch (Super Admin Only)
router.post('/pricing/toggle-payments', requireSuperAdmin, creditController.togglePaymentsCredits);

// Global Transactions Ledger
router.get('/transactions', creditController.getTransactions);

export default router;
