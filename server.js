import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { runMigration } from './services/migrationService.js';
import { runTaskmiteGitmiteSeed } from './services/seedService.js';
import { seedPlatformDataIfEmpty } from './services/seedPlatformData.js';
import { cmsController } from './controllers/cmsController.js';
import { requireAdminAuth, requireModuleAccess } from './middleware/auth.js';
import accountingRoutes from './routes/accountingRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import gitRoutes from './routes/gitRoutes.js';
import gitTransportRoutes from './routes/gitTransportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import misRoutes from './routes/misRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure Git repository storage directory exists
const repoStorageDir = process.env.REPOSITORY_STORAGE_PATH || path.resolve(__dirname, 'repos');
if (!fs.existsSync(repoStorageDir)) {
  fs.mkdirSync(repoStorageDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CUREMASO Admin, CMS, Acmaso, Taskmite & Gitmite Unified Backend API',
    database: 'MongoDB',
    modules: ['CMS', 'Acmaso', 'Taskmite', 'Gitmite', 'Admin Auth'],
    timestamp: new Date(),
  });
});

// CMS Public & Admin Endpoints
app.get('/api/cms/landing-page', cmsController.getLandingPageContent);
app.get('/api/cms/content', cmsController.getLandingPageContent);
app.put('/api/cms/landing-page', requireAdminAuth, cmsController.updateLandingPageContent);
app.post('/api/cms/draft', requireAdminAuth, cmsController.updateLandingPageContent);
app.put('/api/cms/draft', requireAdminAuth, cmsController.updateLandingPageContent);
app.post('/api/cms/landing-page/publish', requireAdminAuth, cmsController.publishLandingPageContent);
app.post('/api/cms/publish', requireAdminAuth, cmsController.publishLandingPageContent);
app.post('/api/cms/upload', requireAdminAuth, upload.single('file'), cmsController.uploadMedia);
app.post('/api/cms/reset', requireAdminAuth, cmsController.resetLandingPageContent);

// Acmaso Accounting Endpoints (Mounted at /api/acmaso and /api)
app.use('/api/acmaso', requireModuleAccess(50), accountingRoutes);
app.use('/api', accountingRoutes);

// Auth Endpoints
app.use('/api/auth', authRoutes);

// User Management Endpoints
app.use('/api/users', userRoutes);

// Platform Modules (Candidates, Startups, Companies, Institutions)
app.use('/api/platform', platformRoutes);
app.use('/api', platformRoutes);

// MIS Dashboard Analytics Endpoints (Module 6)
app.use('/api/mis', requireModuleAccess(6), misRoutes);

// Taskmite Endpoints (Module 17)
app.use('/api/taskmite', requireModuleAccess(17), taskRoutes);

// Gitmite Endpoints (Module 18)
app.use('/api/gitmite', requireModuleAccess(18), gitRoutes);

// Git HTTP Smart Transport (CLI clone/push/pull at /git/:slug.git)
app.use('/git', gitTransportRoutes);

// Start Server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();
    await runMigration();
    await runTaskmiteGitmiteSeed();
    await seedPlatformDataIfEmpty();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 CUREMASO Admin Unified Backend API running on port ${PORT}`);
      console.log(`🗄️  Persistent Database: MongoDB`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📄 CMS Landing Page API: http://localhost:${PORT}/api/cms/landing-page`);
      console.log(`📊 Acmaso Accounting API: http://localhost:${PORT}/api/acmaso/dashboard`);
      console.log(`✅ Taskmite API: http://localhost:${PORT}/api/tasks`);
      console.log(`🌿 Gitmite API: http://localhost:${PORT}/api/repositories`);
      console.log(`🐙 Git Smart Transport: http://localhost:${PORT}/git/<repo-slug>.git`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error(`💥 Failed to start server: ${err.message}`);
    // Start listener in fallback mode if MongoDB fails to prevent hard downtime
    app.listen(PORT, () => {
      console.warn(`⚠️ Server started on port ${PORT} with DB connection warnings.`);
    });
  }
}

startServer();
