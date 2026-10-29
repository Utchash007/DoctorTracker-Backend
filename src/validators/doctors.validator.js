import { z } from 'zod';

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

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

const optionalText = (max) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional()
  );

const optionalDate = (toDate) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .trim()
      .regex(ISO_DATE_PATTERN, 'Use an ISO date (YYYY-MM-DD or a full ISO timestamp)')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Use a valid ISO date')
      .transform(toDate)
      .optional()
  );

const startOfDay = (value) => new Date(value);

// A date-only `to` (the Mantine DateRange default) covers the whole day.
const endOfDay = (value) => {
  const date = new Date(value);
  if (value.length === 10) date.setUTCHours(23, 59, 59, 999);
  return date;
};

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

export const listDoctorsQuerySchema = z
  .object({
    search: optionalText(100),
    specialization: optionalText(100),
    hospital: optionalText(150),
    from: optionalDate(startOfDay),
    to: optionalDate(endOfDay),
    sort: z.enum(['newest', 'oldest', 'name_asc', 'name_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '`from` must be before or equal to `to`',
    path: ['from'],
  });
