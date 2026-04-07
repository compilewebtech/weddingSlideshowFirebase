import { Router, Request, Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';
import { GuestModel } from '../models/Guest';
import { OtpModel } from '../models/OtpCode';
import { WeddingModel } from '../models/Wedding';
import { requireAuth } from '../middleware/auth';
import { validateGuest } from '../middleware/validation';
import { sendConfirmationEmail, sendGoldConfirmationEmail, sendOtpEmail } from '../services/emailService';

const router = Router({ mergeParams: true });
const db = getFirestore();

/** Verify the wedding exists. Returns wedding or sends 404. */
async function requireWeddingExists(req: Request<{ weddingId: string }>, res: Response): Promise<ReturnType<typeof WeddingModel.findById> | null> {
  const wedding = await WeddingModel.findById(req.params.weddingId);
  if (!wedding) {
    res.status(404).json({ error: 'Wedding not found' });
    return null;
  }
  return wedding;
}

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
      attending: guestData.attending as 'yes' | 'no' | 'maybe' | 'pending',
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
      {
        coupleEmail: coupleEmail || undefined,
        sendThankYou: wedding?.sendThankYou !== false,
      }
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

/** Silver direct RSVP — no OTP, email optional based on sendThankYou */
router.post('/rsvp-direct', validateGuest, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;

    const wedding = await WeddingModel.findById(weddingId);
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });

    const email = req.body.email?.trim()?.toLowerCase() || undefined;

    const guestPayload = {
      name: req.body.name as string,
      email,
      attending: req.body.attending as 'yes' | 'no' | 'maybe' | 'pending',
      numberOfGuests: (req.body.numberOfGuests as number) || 1,
      submittedAt: new Date().toISOString(),
      phone: req.body.phone as string | undefined,
      message: req.body.message as string | undefined,
      dietaryRestrictions: req.body.dietaryRestrictions as string | undefined,
      guestNames: Array.isArray(req.body.guestNames)
        ? req.body.guestNames.filter((n: unknown) => typeof n === 'string' && (n as string).trim())
        : undefined,
      guestAttending: Array.isArray(req.body.guestAttending)
        ? req.body.guestAttending.filter((a: unknown) => a === 'yes' || a === 'no')
        : undefined,
    };

    const savedGuest = await GuestModel.create(weddingId, guestPayload);

    // Send emails (non-blocking)
    const coupleEmail = wedding.coupleEmail?.trim();
    const sendThankYou = wedding.sendThankYou !== false;
    sendConfirmationEmail(
      {
        name: savedGuest.name,
        email: savedGuest.email || '',
        attending: savedGuest.attending,
        numberOfGuests: savedGuest.numberOfGuests,
        message: savedGuest.message,
      },
      {
        coupleEmail: coupleEmail || undefined,
        sendThankYou,
      }
    ).catch((err) => {
      console.error('⚠️ Email failed (non-blocking):', err);
    });

    return res.status(201).json(savedGuest);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error direct RSVP:', err.message, err);
    return res.status(500).json({ error: 'Failed to submit RSVP' });
  }
});

router.get('/', requireAuth, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const wedding = await requireWeddingExists(req, res);
    if (!wedding) return;
    const guests = await GuestModel.findAll(req.params.weddingId);
    return res.json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    return res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

router.post('/reset-otp/:email', requireAuth, async (req: Request<{ weddingId: string; email: string }>, res: Response) => {
  try {
    const wedding = await requireWeddingExists(req as unknown as Request<{ weddingId: string }>, res);
    if (!wedding) return;
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

router.delete('/:id', requireAuth, async (req: Request<{ weddingId: string; id: string }>, res: Response) => {
  try {
    const wedding = await requireWeddingExists(req as unknown as Request<{ weddingId: string }>, res);
    if (!wedding) return;
    const { weddingId, id } = req.params;

    // Get guest before deleting to check group membership
    const guest = await GuestModel.findById(weddingId, id);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    const groupId = guest.groupId;

    const deleted = await GuestModel.deleteById(weddingId, id);
    if (!deleted) return res.status(404).json({ error: 'Guest not found' });

    // If guest was in a group, update the remaining members' token
    if (groupId && (wedding.package || 'silver') === 'gold') {
      const remaining = await GuestModel.findByGroupId(weddingId, groupId);
      if (remaining.length === 1) {
        // One left → make solo with individual token
        const solo = remaining[0];
        const soloToken = generateSlugToken(solo.firstName || '', solo.lastName || '');
        await GuestModel.updateGroupId(weddingId, [solo.id], solo.id, soloToken);
      } else if (remaining.length >= 2) {
        // Regenerate group token with remaining members' names
        const details = remaining.map((g) => ({ firstName: g.firstName || '', lastName: g.lastName || '' }));
        const newToken = generateGroupSlugToken(details);
        await GuestModel.updateGroupId(weddingId, remaining.map((g) => g.id), groupId, newToken);
      }
    }

    return res.json({ message: 'Guest deleted', id });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return res.status(500).json({ error: 'Failed to delete guest' });
  }
});

// ============================================================
// Gold Package Endpoints
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Individual: "john-doe-a3f2" */
function generateSlugToken(firstName: string, lastName: string): string {
  const suffix = crypto.randomBytes(2).toString('hex');
  const slug = slugify(`${firstName} ${lastName}`);
  return `${slug}-${suffix}`;
}

/** Group: same last name → "doe-family-b7e1", different → "john-and-jane-c8d4" */
function generateGroupSlugToken(guests: Array<{ firstName: string; lastName: string }>): string {
  const suffix = crypto.randomBytes(2).toString('hex');
  const lastNames = [...new Set(guests.map((g) => g.lastName.toLowerCase().trim()).filter(Boolean))];

  if (lastNames.length === 1 && lastNames[0]) {
    return `${slugify(lastNames[0])}-family-${suffix}`;
  }
  const firstNames = guests.map((g) => slugify(g.firstName)).filter(Boolean);
  return `${firstNames.join('-and-')}-${suffix}`;
}

/** Gold: Upload Excel with guest names (base64 JSON body).
 *  Blank rows in the Excel act as group separators:
 *  consecutive filled rows = one group, single row between blanks = solo. */
router.post('/upload-excel', requireAuth, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { fileBase64 } = req.body;

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'fileBase64 is required' });
    }

    const wedding = await requireWeddingExists(req, res);
    if (!wedding) return;
    if ((wedding.package || 'silver') !== 'gold') {
      return res.status(400).json({ error: 'Excel upload is only available for Gold package weddings' });
    }

    // Parse Excel
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return res.status(400).json({ error: 'Excel file is empty' });

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header row if it looks like a header
    let startIdx = 0;
    if (rows.length > 0) {
      const first = String(rows[0][0] || '').toLowerCase().trim();
      if (first === 'first name' || first === 'firstname' || first === 'first' || first === 'name') {
        startIdx = 1;
      }
    }

    // Split rows into groups separated by blank rows
    const groups: Array<Array<{ firstName: string; lastName: string }>> = [];
    let currentGroup: Array<{ firstName: string; lastName: string }> = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      const firstName = String(row[0] || '').trim();
      if (!firstName) {
        // Blank row = separator
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        continue;
      }
      currentGroup.push({ firstName, lastName: String(row[1] || '').trim() });
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    const totalGuests = groups.reduce((sum, g) => sum + g.length, 0);
    if (totalGuests === 0) {
      return res.status(400).json({ error: 'No guest data found in Excel file' });
    }
    if (totalGuests > 500) {
      return res.status(400).json({ error: `Too many guests (${totalGuests}). Maximum is 500 per upload.` });
    }

    // Merge logic: preserve responded guests, update pending
    const existingGuests = await GuestModel.findAll(weddingId);
    const respondedGuests = existingGuests.filter((g) => g.attending !== 'pending');
    const pendingGuests = existingGuests.filter((g) => g.attending === 'pending');

    const matchKey = (fn: string, ln: string) => `${fn.toLowerCase().trim()}|${ln.toLowerCase().trim()}`;
    const respondedKeys = new Set(respondedGuests.map((g) => matchKey(g.firstName || '', g.lastName || '')));
    const pendingByKey = new Map(pendingGuests.map((g) => [matchKey(g.firstName || '', g.lastName || ''), g]));

    const toCreate: Array<{ firstName: string; lastName: string; guestToken: string; groupId?: string }> = [];
    const keepPendingIds = new Set<string>();

    for (const group of groups) {
      // Filter out already-responded guests from this group
      const newInGroup = group.filter((g) => !respondedKeys.has(matchKey(g.firstName, g.lastName)));

      // Keep existing pending guests
      for (const g of group) {
        const existing = pendingByKey.get(matchKey(g.firstName, g.lastName));
        if (existing) keepPendingIds.add(existing.id);
      }

      // Only create truly new guests
      const toCreateInGroup = newInGroup.filter((g) => !pendingByKey.has(matchKey(g.firstName, g.lastName)));
      if (toCreateInGroup.length === 0) continue;

      if (toCreateInGroup.length === 1) {
        // Solo guest
        const g = toCreateInGroup[0];
        toCreate.push({ ...g, guestToken: generateSlugToken(g.firstName, g.lastName) });
      } else {
        // Group — shared token and groupId
        const groupId = crypto.randomUUID();
        const sharedToken = generateGroupSlugToken(toCreateInGroup);
        for (const g of toCreateInGroup) {
          toCreate.push({ ...g, guestToken: sharedToken, groupId });
        }
      }
    }

    // Also re-group existing pending guests that are now in a group from the Excel
    // (update their groupId/token to match new group members if applicable)
    for (const group of groups) {
      if (group.length < 2) continue;
      // Collect all pending IDs in this group (both existing + newly created will share token)
      const pendingIdsInGroup: string[] = [];
      for (const g of group) {
        const existing = pendingByKey.get(matchKey(g.firstName, g.lastName));
        if (existing) pendingIdsInGroup.push(existing.id);
      }
      // Find if there are new guests being created for this group
      const newInGroup = toCreate.filter((tc) =>
        group.some((g) => matchKey(g.firstName, g.lastName) === matchKey(tc.firstName, tc.lastName))
      );
      if (pendingIdsInGroup.length > 0 && newInGroup.length > 0 && newInGroup[0].groupId) {
        // Update existing pending guests to share the new group's token/groupId
        await GuestModel.updateGroupId(weddingId, pendingIdsInGroup, newInGroup[0].groupId, newInGroup[0].guestToken);
      } else if (pendingIdsInGroup.length >= 2) {
        // All members already exist as pending — group them together
        const groupId = crypto.randomUUID();
        const members = pendingIdsInGroup.map((pid) => {
          const g = pendingGuests.find((pg) => pg.id === pid)!;
          return { firstName: g.firstName || '', lastName: g.lastName || '' };
        });
        const sharedToken = generateGroupSlugToken(members);
        await GuestModel.updateGroupId(weddingId, pendingIdsInGroup, groupId, sharedToken);
      }
    }

    // Delete pending guests not in the new file
    const allKeepIds = new Set([
      ...respondedGuests.map((g) => g.id),
      ...keepPendingIds,
    ]);
    const removed = await GuestModel.deletePendingNotInList(weddingId, allKeepIds);

    // Create new guests
    let created: Awaited<ReturnType<typeof GuestModel.createBatch>> = [];
    if (toCreate.length > 0) {
      created = await GuestModel.createBatch(weddingId, toCreate);
    }

    const finalGuests = await GuestModel.findAll(weddingId);

    return res.json({
      added: created.length,
      preserved: respondedGuests.length,
      removed,
      total: finalGuests.length,
      guests: finalGuests,
    });
  } catch (error) {
    console.error('Error uploading Excel:', error);
    return res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

/** Gold: Add one or more guests manually.
 *  - Single guest with no groupId → solo with individual link
 *  - Single guest with groupId → added to existing group's shared link
 *  - Multiple guests (array) → auto-grouped with a new shared link */
router.post('/add-guest', requireAuth, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { guests: guestList, groupId } = req.body;

    // Accept either { guests: [...] } or legacy { firstName, lastName, groupId }
    const entries: Array<{ firstName: string; lastName: string }> = [];
    if (Array.isArray(guestList)) {
      for (const g of guestList) {
        if (!g.firstName || typeof g.firstName !== 'string' || !g.firstName.trim()) {
          return res.status(400).json({ error: 'Each guest must have a first name' });
        }
        entries.push({ firstName: g.firstName.trim(), lastName: (g.lastName || '').trim() });
      }
    } else if (req.body.firstName) {
      if (typeof req.body.firstName !== 'string' || !req.body.firstName.trim()) {
        return res.status(400).json({ error: 'First name is required' });
      }
      entries.push({ firstName: req.body.firstName.trim(), lastName: (req.body.lastName || '').trim() });
    }

    if (entries.length === 0) {
      return res.status(400).json({ error: 'At least one guest is required' });
    }
    if (entries.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 guests at a time' });
    }

    const wedding = await requireWeddingExists(req, res);
    if (!wedding) return;
    if ((wedding.package || 'silver') !== 'gold') {
      return res.status(400).json({ error: 'Add guest is only available for Gold package weddings' });
    }

    if (groupId) {
      // Adding to an existing group — reuse its token
      const groupMembers = await GuestModel.findByGroupId(weddingId, groupId);
      if (groupMembers.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (groupMembers.some((g) => g.attending !== 'pending')) {
        return res.status(400).json({ error: 'Cannot add to a group that has already responded' });
      }
      const sharedToken = groupMembers[0].guestToken || generateSlugToken(entries[0].firstName, entries[0].lastName);
      const created = await GuestModel.createBatch(weddingId, entries.map((g) => ({
        ...g, guestToken: sharedToken, groupId,
      })));
      return res.status(201).json(created);
    }

    if (entries.length === 1) {
      // Solo guest
      const g = entries[0];
      const saved = await GuestModel.create(weddingId, {
        firstName: g.firstName,
        lastName: g.lastName,
        name: `${g.firstName} ${g.lastName}`.trim(),
        guestToken: generateSlugToken(g.firstName, g.lastName),
        attending: 'pending',
        numberOfGuests: 1,
        submittedAt: '',
      });
      return res.status(201).json([saved]);
    }

    // Multiple guests → new group with shared link
    const newGroupId = crypto.randomUUID();
    const sharedToken = generateGroupSlugToken(entries);
    const created = await GuestModel.createBatch(weddingId, entries.map((g) => ({
      ...g, guestToken: sharedToken, groupId: newGroupId,
    })));
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error adding guest:', error);
    return res.status(500).json({ error: 'Failed to add guest' });
  }
});

/** Gold: Group multiple guests under one shared link */
router.post('/group', requireAuth, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { guestIds } = req.body;

    if (!Array.isArray(guestIds) || guestIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 guest IDs are required to create a group' });
    }

    const wedding = await requireWeddingExists(req, res);
    if (!wedding) return;
    if ((wedding.package || 'silver') !== 'gold') {
      return res.status(400).json({ error: 'Grouping is only available for Gold package weddings' });
    }

    // Verify all guests exist and are pending, collect details for slug
    const guestDetails: Array<{ firstName: string; lastName: string }> = [];
    for (const id of guestIds) {
      const guest = await GuestModel.findById(weddingId, id);
      if (!guest) return res.status(404).json({ error: `Guest ${id} not found` });
      if (guest.attending !== 'pending') {
        return res.status(400).json({ error: `Guest "${guest.name}" has already responded and cannot be grouped` });
      }
      guestDetails.push({ firstName: guest.firstName || '', lastName: guest.lastName || '' });
    }

    const groupId = guestIds[0]; // use first guest's ID as groupId
    const guestToken = generateGroupSlugToken(guestDetails);
    await GuestModel.updateGroupId(weddingId, guestIds, groupId, guestToken);

    const guests = await GuestModel.findByGroupId(weddingId, groupId);
    return res.json({ groupId, guestToken, guests });
  } catch (error) {
    console.error('Error grouping guests:', error);
    return res.status(500).json({ error: 'Failed to group guests' });
  }
});

/** Gold: Ungroup guests — each gets their own link */
router.post('/ungroup', requireAuth, async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { guestIds } = req.body;

    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return res.status(400).json({ error: 'Guest IDs are required' });
    }

    const wedding = await requireWeddingExists(req, res);
    if (!wedding) return;
    if ((wedding.package || 'silver') !== 'gold') {
      return res.status(400).json({ error: 'Ungrouping is only available for Gold package weddings' });
    }

    // Verify all guests exist and are pending, then generate individual slug tokens
    const tokenMap = new Map<string, string>();
    for (const id of guestIds) {
      const guest = await GuestModel.findById(weddingId, id);
      if (!guest) return res.status(404).json({ error: `Guest ${id} not found` });
      if (guest.attending !== 'pending') {
        return res.status(400).json({ error: `Guest "${guest.name}" has already responded and cannot be ungrouped` });
      }
      tokenMap.set(id, generateSlugToken(guest.firstName || '', guest.lastName || ''));
    }
    await GuestModel.removeGroupId(weddingId, tokenMap);

    const guests = await GuestModel.findAll(weddingId);
    return res.json({ guests });
  } catch (error) {
    console.error('Error ungrouping guests:', error);
    return res.status(500).json({ error: 'Failed to ungroup guests' });
  }
});

/** Gold: Look up guests by personalized token */
router.get('/by-token/:token', async (req: Request<{ weddingId: string; token: string }>, res: Response) => {
  try {
    const { weddingId, token } = req.params;
    const guests = await GuestModel.findByToken(weddingId, token);

    if (guests.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    const alreadyResponded = guests.some((g) => g.attending !== 'pending');
    return res.json({ guests, alreadyResponded });
  } catch (error) {
    console.error('Error looking up token:', error);
    return res.status(500).json({ error: 'Failed to look up invitation' });
  }
});

/** Gold: Submit RSVP for a group/individual via personalized token */
router.post('/rsvp-gold', async (req: Request<{ weddingId: string }>, res: Response) => {
  try {
    const { weddingId } = req.params;
    const { guestToken, responses, email, dietaryRestrictions, message } = req.body;

    if (!guestToken || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'guestToken and responses are required' });
    }

    const wedding = await WeddingModel.findById(weddingId);
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    if ((wedding.package || 'silver') !== 'gold') {
      return res.status(400).json({ error: 'This endpoint is only for Gold package weddings' });
    }

    // Validate token and get guests
    const tokenGuests = await GuestModel.findByToken(weddingId, guestToken);
    if (tokenGuests.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    // Check if already responded
    if (tokenGuests.some((g) => g.attending !== 'pending')) {
      return res.status(409).json({ error: 'This invitation has already been used' });
    }

    // Validate all response guestIds belong to this token group
    const tokenGuestIds = new Set(tokenGuests.map((g) => g.id));
    for (const r of responses) {
      if (!tokenGuestIds.has(r.guestId)) {
        return res.status(400).json({ error: `Guest ${r.guestId} does not belong to this invitation` });
      }
      if (!['yes', 'no'].includes(r.attending)) {
        return res.status(400).json({ error: 'Attending must be "yes" or "no"' });
      }
    }

    // Use transaction to prevent race condition
    const firestore = getFirestore();
    await firestore.runTransaction(async (transaction) => {
      // Re-check inside transaction
      for (const guest of tokenGuests) {
        const ref = firestore.collection('weddings').doc(weddingId).collection('guests').doc(guest.id);
        const doc = await transaction.get(ref);
        if (doc.data()?.attending !== 'pending') {
          throw new Error('ALREADY_RESPONDED');
        }
      }

      const submittedAt = new Date().toISOString();
      for (const r of responses) {
        const ref = firestore.collection('weddings').doc(weddingId).collection('guests').doc(r.guestId);
        const updateData: Record<string, unknown> = {
          attending: r.attending,
          submittedAt,
        };
        if (email) updateData.email = email.trim().toLowerCase();
        if (dietaryRestrictions) updateData.dietaryRestrictions = dietaryRestrictions;
        if (message) updateData.message = message;
        transaction.update(ref, updateData);
      }
    });

    // Send emails (non-blocking)
    const coupleEmail = wedding.coupleEmail?.trim();
    const guestNames = tokenGuests.map((g) => g.name);
    const attendingNames = responses.filter((r: { attending: string }) => r.attending === 'yes').map((r: { guestId: string }) => {
      const g = tokenGuests.find((tg) => tg.id === r.guestId);
      return g?.name || '';
    });

    sendGoldConfirmationEmail(
      {
        guestNames,
        attendingNames,
        email: email?.trim()?.toLowerCase(),
        message,
      },
      {
        coupleEmail: coupleEmail || undefined,
        sendThankYou: wedding.sendThankYou !== false,
      }
    ).catch((err) => {
      console.error('⚠️ Gold email failed (non-blocking):', err);
    });

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_RESPONDED') {
      return res.status(409).json({ error: 'This invitation has already been used' });
    }
    console.error('Error submitting Gold RSVP:', error);
    return res.status(500).json({ error: 'Failed to submit RSVP' });
  }
});

export default router;
