import { z } from 'zod';

export const patientsPerDoctorQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const timelineQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
});
