import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;
  if (error?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  }

  const isOperational = error instanceof ApiError;
  const status = isOperational ? error.status : 500;
  const code = isOperational ? error.code : 'INTERNAL_ERROR';
  const message = isOperational
    ? error.message
    : env.isProduction
      ? 'Internal server error'
      : error?.message || 'Internal server error';

  if (!isOperational) {
    console.error(error);
  }

  const body = { error: { code, message } };
  if (isOperational && error.details !== undefined) {
    body.error.details = error.details;
  }

  res.status(status).json(body);
}
