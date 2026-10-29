import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

// Public.
router.get('/health', getHealth);

// Resource routers (doctors, patients, dashboard) mount below
// `router.use(authenticate)` once the Clerk middleware lands in phase B2.

export default router;
