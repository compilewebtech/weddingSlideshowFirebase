import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('❌ Unhandled error:', err.message);

  const origin = req.get('Origin');
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(500).json({
    error: 'Internal server error',
    ...(false && { details: err.message, stack: err.stack }),
  });
}