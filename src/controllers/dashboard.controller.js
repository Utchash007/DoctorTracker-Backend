import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSummary = asyncHandler(async (_req, res) => {
  const summary = await dashboardService.getSummary();
  res.status(200).json({ data: summary });
});

export const getPatientsPerDoctor = asyncHandler(async (req, res) => {
  const rows = await dashboardService.getPatientsPerDoctor(req.validated.query.limit);
  res.status(200).json({ data: rows });
});

export const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await dashboardService.getTimeline(req.validated.query.range);
  res.status(200).json({ data: timeline });
});
