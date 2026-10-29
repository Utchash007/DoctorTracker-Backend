import * as doctorsService from '../services/doctors.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listDoctors = asyncHandler(async (req, res) => {
  const { items, meta } = await doctorsService.listDoctors(req.validated.query);
  res.status(200).json({ data: items, meta });
});

export const getDoctorFilters = asyncHandler(async (_req, res) => {
  const filters = await doctorsService.getDoctorFilters();
  res.status(200).json({ data: filters });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.getDoctorById(req.validated.params.id);
  res.status(200).json({ data: doctor });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.createDoctor(req.validated.body);
  res.status(201).json({ data: doctor });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorsService.updateDoctor(
    req.validated.params.id,
    req.validated.body
  );
  res.status(200).json({ data: doctor });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const result = await doctorsService.deleteDoctor(req.validated.params.id);
  res.status(200).json({ data: result });
});
