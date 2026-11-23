import { Router } from 'express';
import { requireAuth, staffOnly } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { categoryBreakdown, fineCollectionChart, loanVolumeChart, overview, popularResources, viewedResources } from '../services/analytics.js';

const router = Router();
router.use(requireAuth, staffOnly);

router.get('/overview', asyncHandler(async (_req, res) => res.json(overview())));
router.get('/popular', asyncHandler(async (_req, res) => res.json({ items: popularResources(6) })));
router.get('/viewed', asyncHandler(async (_req, res) => res.json({ items: viewedResources(6) })));
router.get('/categories', asyncHandler(async (_req, res) => res.json({ items: categoryBreakdown() })));
router.get('/fine-collection', asyncHandler(async (_req, res) => res.json({ items: fineCollectionChart() })));
router.get('/loan-volume', asyncHandler(async (_req, res) => res.json({ items: loanVolumeChart() })));

export default router;
