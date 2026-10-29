import { z } from 'zod';
import {
  endOfDay,
  optionalIsoDate,
  optionalObjectId,
  optionalText,
  startOfDay,
  withDateRange,
} from './common.js';

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

const age = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    if (value.trim() === '') return undefined;
    return Number(value);
  },
  z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Age is required' : 'Age must be a number',
    })
    .int('Age must be a whole number')
    .min(0, 'Age must be 0 or greater')
    .max(130, 'Age must be at most 130')
);

const gender = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z
    .enum(['male', 'female', 'other'], {
      error: 'Gender must be male, female or other',
    })
    .optional()
);

const phone = z
  .string({ error: 'Phone is required' })
  .trim()
  .regex(
    /^[0-9+().\- ]{7,20}$/,
    'Phone must be 7-20 characters using digits, spaces, + ( ) . -'
  );

const condition = z
  .string({ error: 'Condition is required' })
  .trim()
  .min(1, 'Condition is required')
  .max(150, 'Condition must be at most 150 characters');

export const createPatientSchema = z.object({
  name,
  age,
  gender,
  phone,
  condition,
});

export const updatePatientSchema = createPatientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listDoctorPatientsQuerySchema = z.object({
  search: optionalText(100),
  condition: optionalText(150),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const listPatientsQuerySchema = withDateRange(
  z.object({
    search: optionalText(100),
    condition: optionalText(150),
    doctorId: optionalObjectId('Invalid doctorId'),
    from: optionalIsoDate(startOfDay),
    to: optionalIsoDate(endOfDay),
    sort: z.enum(['newest', 'oldest', 'name_asc', 'name_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
);
