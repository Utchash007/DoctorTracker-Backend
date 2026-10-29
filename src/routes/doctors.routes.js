import { Router } from 'express';
import * as doctorsController from '../controllers/doctors.controller.js';
import { validate, validateIdParam } from '../middleware/validate.js';
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from '../validators/doctors.validator.js';

const router = Router();

// `/filters` must be declared before `/:id`.
router.get(
  '/',
  validate({ query: listDoctorsQuerySchema }),
  doctorsController.listDoctors
);
router.get('/filters', doctorsController.getDoctorFilters);
router.post(
  '/',
  validate({ body: createDoctorSchema }),
  doctorsController.createDoctor
);
router.get('/:id', validateIdParam(), doctorsController.getDoctor);
router.patch(
  '/:id',
  validateIdParam(),
  validate({ body: updateDoctorSchema }),
  doctorsController.updateDoctor
);
router.delete('/:id', validateIdParam(), doctorsController.deleteDoctor);

export default router;
