import { Router, Request, Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GuestModel } from '../models/Guest';
import { OtpModel } from '../models/OtpCode';
import { WeddingModel } from '../models/Wedding';
import { validateGuest } from '../middleware/validation';
import { sendConfirmationEmail, sendOtpEmail } from '../services/emailService';

const router = Router({ mergeParams: true });
const db = getFirestore();

const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // effectively permanent

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function checkOtpRateLimit(weddingId: string, email: string): Promise<boolean> {
  const docId = email.replace(/[^a-z0-9]/g, '_');
  const ref = db.collection('weddings').doc(weddingId).collection('otpRateLimits').doc(docId);
  const doc = await ref.get();

  const now = Date.now();
  if (doc.exists) {
    const data = doc.data()!;
    const windowStart = data.windowStart?.toDate?.()?.getTime() ?? 0;
    if (now - windowStart < RATE_LIMIT_WINDOW_MS) {
      if ((data.count || 0) >= RATE_LIMIT_MAX) return false; // blocked
      await ref.update({ count: (data.count || 0) + 1 });
      return true;
    }
  }
  // New window
  await ref.set({ count: 1, windowStart: Timestamp.fromDate(new Date(now)) });
  return true;
}

router.post('/send-otp', validateGuest, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const email = req.body.email?.trim()?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    const useInMemory = false;
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

    const allowed = await checkOtpRateLimit(weddingId, email);
    if (!allowed) {
      return res.status(429).json({ error: 'You have used all verification attempts for this email. Please check your inbox and spam folder.' });
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
    if (Array.isArray(req.body.guestNames) && req.body.guestNames.length > 0) {
      guestData.guestNames = req.body.guestNames.filter((n: unknown) => typeof n === 'string' && n.trim());
    }

    const otp = generateOtp();
    await OtpModel.create(weddingId, email, otp, guestData);
    await sendOtpEmail(email, otp);

    return res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error sending OTP:', err.message, err);
    const isDev = false;
    const isEmailError = err.message.includes('Email') || err.message.includes('auth') || err.message.includes('ECONNECTION') || err.message.includes('Invalid login');
    const message = isEmailError
      ? 'Email service unavailable. Please try again later or contact the hosts.'
      : 'Failed to send verification code';
    return res.status(500).json({
      error: message,
      ...(isDev ? { debug: err.message } : {}),
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

    const useInMemory = false;
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
      guestNames: Array.isArray(guestData.guestNames) ? guestData.guestNames : undefined,
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

    const wedding = await WeddingModel.findById(weddingId);
    const coupleEmail = wedding?.coupleEmail?.trim();

    sendConfirmationEmail(
      {
        name: savedGuest.name,
        email: savedGuest.email || '',
        attending: savedGuest.attending,
        numberOfGuests: savedGuest.numberOfGuests,
        message: savedGuest.message,
      },
      { coupleEmail: coupleEmail || undefined }
    ).catch((err) => {
      console.error('⚠️ Email failed (non-blocking):', err);
    });

    return res.status(201).json(savedGuest);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error verifying OTP:', err.message, err);
    const isDev = false;
    return res.status(500).json({
      error: 'Failed to confirm RSVP',
      ...(isDev ? { debug: err.message } : {}),
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

router.post('/reset-otp/:email', async (req: Request<{ weddingId: string; email: string }>, res: Response) => {
  try {
    const { weddingId, email } = req.params;
    const normalizedEmail = email.trim().toLowerCase();
    const docId = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const ref = db.collection('weddings').doc(weddingId).collection('otpRateLimits').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.json({ message: 'No rate limit found for this email' });
    }
    // Grant exactly 1 more attempt
    await ref.update({ count: RATE_LIMIT_MAX - 1 });
    return res.json({ message: 'OTP reset — guest can request 1 more code' });
  } catch (error) {
    console.error('Error resetting OTP:', error);
    return res.status(500).json({ error: 'Failed to reset OTP' });
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
