import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public.
router.get('/health', getHealth);

// Everything below requires a valid Clerk session token.
router.use(authenticate);

// Resource routers (doctors, patients, dashboard) mount below this point
// starting in B3.

export default router;
