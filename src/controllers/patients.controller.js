import * as patientsService from '../services/patients.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPatients = asyncHandler(async (req, res) => {
  const { items, meta } = await patientsService.listPatients(req.validated.query);
  res.status(200).json({ data: items, meta });
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.getPatientById(req.validated.params.id);
  res.status(200).json({ data: patient });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.updatePatient(
    req.validated.params.id,
    req.validated.body
  );
  res.status(200).json({ data: patient });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const result = await patientsService.deletePatient(req.validated.params.id);
  res.status(200).json({ data: result });
});

export const listDoctorPatients = asyncHandler(async (req, res) => {
  const { items, meta } = await patientsService.listDoctorPatients(
    req.validated.params.id,
    req.validated.query
  );
  res.status(200).json({ data: items, meta });
});

export const createDoctorPatient = asyncHandler(async (req, res) => {
  const patient = await patientsService.createDoctorPatient(
    req.validated.params.id,
    req.validated.body
  );
  res.status(201).json({ data: patient });
});

export const removeDoctorPatient = asyncHandler(async (req, res) => {
  const result = await patientsService.removeDoctorPatient(
    req.validated.params.id,
    req.validated.params.patientId
  );
  res.status(200).json({ data: result });
});
