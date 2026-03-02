import { Router, Request, Response } from 'express';
import { GuestModel } from '../models/Guest';
import { validateGuest } from '../middleware/validation';
import { sendConfirmationEmail } from '../services/emailService';

const router = Router();

// GET all guests
router.get('/', async (_req: Request, res: Response) => {
  try {
    const guests = await GuestModel.findAll();
    return res.json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

// POST new guest
router.post('/', validateGuest, async (req: Request, res: Response) => {
  try {
    const guestData = {
      name: req.body.name,
      email: req.body.email || undefined,
      phone: req.body.phone || undefined,
      attending: req.body.attending,
      numberOfGuests: req.body.numberOfGuests || 1,
      message: req.body.message || undefined,
      submittedAt: new Date().toISOString(),
    };

    const savedGuest = await GuestModel.create(guestData);
    console.log('✅ Guest saved:', savedGuest.name);

    // Send confirmation email (non-blocking)
    if (savedGuest.email) {
      sendConfirmationEmail({ ...savedGuest, email: savedGuest.email }).catch((err) => {
        console.error('⚠️ Email failed (non-blocking):', err.message);
      });
    }

    return res.status(201).json(savedGuest);
  } catch (error) {
    console.error('Error saving guest:', error);
    return res.status(500).json({ error: 'Failed to save guest' });
  }
});

// DELETE guest
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await GuestModel.deleteById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    return res.json({ message: 'Guest deleted', id });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return res.status(500).json({ error: 'Failed to delete guest' });
  }
});

export default router;