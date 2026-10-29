import { ApiError } from '../utils/ApiError.js';

const PARTS = ['params', 'query', 'body'];

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

    req.validated = validated;
    return next();
  };
}
