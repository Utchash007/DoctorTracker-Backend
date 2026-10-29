import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(_req, _res, next) {
  next(ApiError.notFound('Route not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;
  if (error?.type === 'entity.too.large') {
    error = ApiError.payloadTooLarge();
  } else if (error?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  }

  const isOperational = error instanceof ApiError;
  const status = isOperational ? error.status : 500;
  const code = isOperational ? error.code : 'INTERNAL_ERROR';
  const hideDetails = env.isProduction && status >= 500;
  const message = hideDetails
    ? 'Internal server error'
    : isOperational
      ? error.message
      : error?.message || 'Internal server error';

  if (!isOperational || status >= 500) {
    console.error(error);
  }

  const body = { error: { code, message } };
  if (isOperational && error.details !== undefined) {
    body.error.details = error.details;
  }

  res.status(status).json(body);
}
