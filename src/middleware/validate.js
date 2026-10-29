import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const PARTS = ['params', 'query', 'body'];

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

function toDetails(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}

/**
 * Validates the declared request parts with Zod and exposes the parsed values
 * on req.validated. Controllers never read raw req.body/req.query/req.params.
 *
 * Usage: validate({ params: idSchema, query: listQuerySchema, body: createSchema })
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(ApiError.validation(toDetails(result.error)));
      }

      validated[part] = result.data;
    }

    req.validated = { ...(req.validated ?? {}), ...validated };
    return next();
  };
}

/**
 * Validates a route param as a MongoDB ObjectId. Malformed ids produce the
 * spec's INVALID_ID code instead of VALIDATION_ERROR.
 */
export function validateIdParam(param = 'id') {
  return (req, _res, next) => {
    const result = objectIdSchema.safeParse(req.params[param]);
    if (!result.success) {
      return next(ApiError.invalidId(`Invalid ${param}`));
    }

    req.validated = {
      ...(req.validated ?? {}),
      params: { ...(req.validated?.params ?? {}), [param]: result.data },
    };
    return next();
  };
}
