import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('❌ Unhandled error:', err.message);

  // CORS headers are already set by the upstream middleware — don't echo arbitrary origins here

  res.status(500).json({
    error: 'Internal server error',
    ...(false ? { details: err.message, stack: err.stack } : {}),
  });
}