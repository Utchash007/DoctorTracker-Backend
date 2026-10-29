import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { validate } from '../middleware/validate.js';
import {
  patientsPerDoctorQuerySchema,
  timelineQuerySchema,
} from '../validators/dashboard.validator.js';

const router = Router();

router.get('/summary', dashboardController.getSummary);
router.get(
  '/patients-per-doctor',
  validate({ query: patientsPerDoctorQuerySchema }),
  dashboardController.getPatientsPerDoctor
);
router.get(
  '/timeline',
  validate({ query: timelineQuerySchema }),
  dashboardController.getTimeline
);

export default router;
