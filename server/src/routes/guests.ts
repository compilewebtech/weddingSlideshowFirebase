import { Router, Request, Response } from 'express';
import { GuestModel } from '../models/Guest';
import { validateGuest } from '../middleware/validation';
import { sendConfirmationEmail } from '../services/emailService';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const guests = await GuestModel.findAll(weddingId);
    return res.json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

router.post('/', validateGuest, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const guestData: Record<string, unknown> = {
      name: req.body.name,
      email: req.body.email,
      attending: req.body.attending,
      numberOfGuests: req.body.numberOfGuests || 1,
      submittedAt: new Date().toISOString(),
    };
    if (req.body.phone) guestData.phone = req.body.phone;
    if (req.body.message) guestData.message = req.body.message;
    if (req.body.dietaryRestrictions) guestData.dietaryRestrictions = req.body.dietaryRestrictions;

    const savedGuest = await GuestModel.create(weddingId, guestData as Parameters<typeof GuestModel.create>[1]);

    if (savedGuest.email) {
      sendConfirmationEmail({
        name: savedGuest.name,
        email: savedGuest.email,
        attending: savedGuest.attending,
        numberOfGuests: savedGuest.numberOfGuests,
        message: savedGuest.message,
      }).catch((err) => {
        console.error('⚠️ Email failed (non-blocking):', err);
      });
    }

    return res.status(201).json(savedGuest);
  } catch (error) {
    console.error('Error saving guest:', error);
    return res.status(500).json({ error: 'Failed to save guest' });
  }
});

router.delete('/:id', async (req: Request<{ weddingId: string; id: string }>, res: Response) => {
  try {
    const { weddingId, id } = req.params;
    const deleted = await GuestModel.deleteById(weddingId, id);
    if (!deleted) return res.status(404).json({ error: 'Guest not found' });
    return res.json({ message: 'Guest deleted', id });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return res.status(500).json({ error: 'Failed to delete guest' });
  }
});

export default router;
