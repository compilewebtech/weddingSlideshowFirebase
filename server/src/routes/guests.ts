import { Router, Request, Response } from 'express';
import { GuestModel } from '../models/Guest';
import { OtpModel } from '../models/OtpCode';
import { validateGuest } from '../middleware/validation';
import { sendConfirmationEmail, sendOtpEmail } from '../services/emailService';

const router = Router({ mergeParams: true });

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/send-otp', validateGuest, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const email = req.body.email?.trim()?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    const useInMemory = process.env.USE_IN_MEMORY_OTP === 'true' || process.env.NODE_ENV !== 'production';
    try {
      const existing = await GuestModel.findByEmail(weddingId, email);
      if (existing) {
        return res.status(409).json({ error: 'This email has already been used to RSVP. Each guest may only reserve once.' });
      }
    } catch (e) {
      if (useInMemory) {
        console.warn('⚠️ Duplicate check skipped (USE_IN_MEMORY_OTP):', (e as Error).message);
      } else {
        throw e;
      }
    }

    const guestData: Record<string, unknown> = {
      name: req.body.name,
      email,
      attending: req.body.attending,
      numberOfGuests: req.body.numberOfGuests || 1,
      submittedAt: new Date().toISOString(),
    };
    if (req.body.phone) guestData.phone = req.body.phone;
    if (req.body.message) guestData.message = req.body.message;
    if (req.body.dietaryRestrictions) guestData.dietaryRestrictions = req.body.dietaryRestrictions;

    const otp = generateOtp();
    await OtpModel.create(weddingId, email, otp, guestData);
    await sendOtpEmail(email, otp);

    return res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error sending OTP:', err.message, err);
    const isDev = process.env.NODE_ENV !== 'production';
    const isEmailError = err.message.includes('Email') || err.message.includes('auth') || err.message.includes('ECONNECTION') || err.message.includes('Invalid login');
    const message = isEmailError
      ? 'Email service unavailable. Please try again later or contact the hosts.'
      : 'Failed to send verification code';
    return res.status(500).json({
      error: message,
      ...(isDev && { debug: err.message }),
    });
  }
});

router.post('/verify-otp', async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { email, otp } = req.body;
    if (!email || !otp || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const guestData = await OtpModel.verifyAndConsume(weddingId, normalizedEmail, otp.trim());
    if (!guestData) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const useInMemory = process.env.USE_IN_MEMORY_OTP === 'true' || process.env.NODE_ENV !== 'production';
    try {
      const existing = await GuestModel.findByEmail(weddingId, normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'This email has already been used to RSVP.' });
      }
    } catch (e) {
      if (useInMemory) {
        console.warn('⚠️ Duplicate check skipped (verify):', (e as Error).message);
      } else {
        throw e;
      }
    }

    const guestPayload = {
      name: guestData.name as string,
      email: normalizedEmail,
      attending: guestData.attending as 'yes' | 'no' | 'maybe',
      numberOfGuests: (guestData.numberOfGuests as number) || 1,
      submittedAt: guestData.submittedAt as string,
      phone: guestData.phone as string | undefined,
      message: guestData.message as string | undefined,
      dietaryRestrictions: guestData.dietaryRestrictions as string | undefined,
    };

    let savedGuest;
    try {
      savedGuest = await GuestModel.create(weddingId, guestPayload);
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : String(createErr);
      if (useInMemory && msg.includes('PERMISSION_DENIED')) {
        console.warn('⚠️ Firestore create failed (dev mode) - returning success without persisting. Run: gcloud auth application-default login');
        savedGuest = { id: 'dev-' + Date.now(), ...guestPayload };
      } else {
        throw createErr;
      }
    }

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
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error verifying OTP:', err.message, err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: 'Failed to confirm RSVP',
      ...(isDev && { debug: err.message }),
    });
  }
});

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
