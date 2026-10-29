import { z } from 'zod';
import {
  endOfDay,
  optionalIsoDate,
  optionalText,
  startOfDay,
  withDateRange,
} from './common.js';

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

const specialization = z
  .string({ error: 'Specialization is required' })
  .trim()
  .min(1, 'Specialization is required')
  .max(100, 'Specialization must be at most 100 characters');

const hospital = z
  .string({ error: 'Hospital is required' })
  .trim()
  .min(1, 'Hospital is required')
  .max(150, 'Hospital must be at most 150 characters');

const phone = z
  .string({ error: 'Phone is required' })
  .trim()
  .regex(
    /^[0-9+().\- ]{7,20}$/,
    'Phone must be 7-20 characters using digits, spaces, + ( ) . -'
  );

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email'));

export const createDoctorSchema = z.object({
  name,
  specialization,
  hospital,
  phone,
  email,
});

export const updateDoctorSchema = createDoctorSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listDoctorsQuerySchema = withDateRange(
  z.object({
    search: optionalText(100),
    specialization: optionalText(100),
    hospital: optionalText(150),
    from: optionalIsoDate(startOfDay),
    to: optionalIsoDate(endOfDay),
    sort: z.enum(['newest', 'oldest', 'name_asc', 'name_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
);
