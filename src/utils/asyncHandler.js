/**
 * Wraps an async route handler so rejected promises reach the central
 * error handler instead of crashing the process.
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
