import { Router } from 'express';
import * as doctorsController from '../controllers/doctors.controller.js';
import * as patientsController from '../controllers/patients.controller.js';
import { validate, validateIdParam } from '../middleware/validate.js';
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from '../validators/doctors.validator.js';
import {
  createPatientSchema,
  listDoctorPatientsQuerySchema,
} from '../validators/patients.validator.js';

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

// A doctor's patients. Declared before `/:id` for readability; the paths have
// extra segments, so they never collide with the doctor detail route.
router.get(
  '/:id/patients',
  validateIdParam(),
  validate({ query: listDoctorPatientsQuerySchema }),
  patientsController.listDoctorPatients
);
router.post(
  '/:id/patients',
  validateIdParam(),
  validate({ body: createPatientSchema }),
  patientsController.createDoctorPatient
);
router.delete(
  '/:id/patients/:patientId',
  validateIdParam(),
  validateIdParam('patientId'),
  patientsController.removeDoctorPatient
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
