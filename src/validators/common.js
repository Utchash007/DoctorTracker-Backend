import { z } from 'zod';

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/** Query-string text: trimmed, blank means "not provided". */
export const optionalText = (max) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional()
  );

/** Query-string MongoDB ObjectId, blank means "not provided". */
export const optionalObjectId = (message = 'Invalid id') =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().regex(/^[0-9a-fA-F]{24}$/, message).optional()
  );

/** Query-string ISO date; `toDate` decides whether it is a start or end bound. */
export const optionalIsoDate = (toDate) =>
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

export const startOfDay = (value) => new Date(value);

// A date-only `to` (the Mantine DateRange default) covers the whole day.
export const endOfDay = (value) => {
  const date = new Date(value);
  if (value.length === 10) date.setUTCHours(23, 59, 59, 999);
  return date;
};

/** Applies the shared `from <= to` rule to a query schema. */
export const withDateRange = (schema) =>
  schema.refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '`from` must be before or equal to `to`',
    path: ['from'],
  });
