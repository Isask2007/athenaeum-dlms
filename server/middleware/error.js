export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message) => new AppError(message, 400, 'BAD_REQUEST');
export const unauthorized = (message = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED');
export const forbidden = (message = 'You do not have permission for this action') => new AppError(message, 403, 'FORBIDDEN');
export const notFound = (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND');
export const conflict = (message) => new AppError(message, 409, 'CONFLICT');

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(error, _req, res, _next) {
  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  const status = error.status || 500;
  if (status >= 500) console.error('[API ERROR]', error);
  res.status(status).json({
    error: error.message || 'Unexpected server error',
    code: error.code || 'INTERNAL_ERROR',
  });
}
