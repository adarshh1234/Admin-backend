import express from 'express';
import gitTransportController from '../controllers/gitTransportController.js';

const router = express.Router();

router.get('/:slug.git/info/refs', gitTransportController.infoRefs);
router.post('/:slug.git/git-upload-pack', express.raw({ type: '*/*', limit: '100mb' }), gitTransportController.uploadPack);
router.post('/:slug.git/git-receive-pack', express.raw({ type: '*/*', limit: '100mb' }), gitTransportController.receivePack);

export default router;
