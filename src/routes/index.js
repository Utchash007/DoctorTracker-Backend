import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import doctorsRoutes from './doctors.routes.js';
import patientsRoutes from './patients.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Public.
router.get('/health', getHealth);

// Everything below requires a valid Clerk session with the admin role.
router.use(authenticate);
router.use(authorize('admin'));

router.use('/doctors', doctorsRoutes);
router.use('/patients', patientsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
