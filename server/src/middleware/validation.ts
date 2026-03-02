import { Request, Response, NextFunction } from 'express';

export function validateGuest(req: Request, res: Response, next: NextFunction) {
  const { name, attending } = req.body;

  console.log('Validating RSVP:', req.body);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be under 100 characters' });
  }

  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'Attending status is required' });
  }

  if (req.body.email && typeof req.body.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  if (req.body.numberOfGuests !== undefined) {
    const num = Number(req.body.numberOfGuests);
    if (isNaN(num) || num < 1 || num > 10) {
      return res.status(400).json({ error: 'Number of guests must be between 1 and 10' });
    }
  }

  if (req.body.message && req.body.message.length > 500) {
    return res.status(400).json({ error: 'Message must be under 500 characters' });
  }

  req.body.name = req.body.name.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.phone) req.body.phone = req.body.phone.trim();
  if (req.body.message) req.body.message = req.body.message.trim();

  next();
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};