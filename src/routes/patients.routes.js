import { Router } from 'express';
import * as patientsController from '../controllers/patients.controller.js';
import { validate, validateIdParam } from '../middleware/validate.js';
import {
  listPatientsQuerySchema,
  updatePatientSchema,
} from '../validators/patients.validator.js';

const router = Router();

router.get(
  '/',
  validate({ query: listPatientsQuerySchema }),
  patientsController.listPatients
);
router.get('/:id', validateIdParam(), patientsController.getPatient);
router.patch(
  '/:id',
  validateIdParam(),
  validate({ body: updatePatientSchema }),
  patientsController.updatePatient
);
router.delete('/:id', validateIdParam(), patientsController.deletePatient);

export default router;
