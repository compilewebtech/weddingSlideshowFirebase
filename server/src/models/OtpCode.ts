import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();
const OTP_EXPIRY_MINUTES = 10;
const USE_IN_MEMORY = false;

function docIdFromEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

const inMemoryStore = new Map<string, { otp: string; guestData: Record<string, unknown>; expiresAt: number }>();

function inMemoryKey(weddingId: string, email: string): string {
  return `${weddingId}:${docIdFromEmail(email)}`;
}

function getOtpCollection(weddingId: string) {
  return db.collection('weddings').doc(weddingId).collection('otpCodes');
}

export const OtpModel = {
  async create(
    weddingId: string,
    email: string,
    otp: string,
    guestData: Record<string, unknown>
  ): Promise<void> {
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
    if (USE_IN_MEMORY) {
      inMemoryStore.set(inMemoryKey(weddingId, email), { otp, guestData, expiresAt });
      return;
    }
    const docId = docIdFromEmail(email);
    await getOtpCollection(weddingId).doc(docId).set({
      weddingId,
      email: email.trim().toLowerCase(),
      otp,
      guestData,
      expiresAt: Timestamp.fromDate(new Date(expiresAt)),
    });
  },

  async verifyAndConsume(
    weddingId: string,
    email: string,
    otp: string
  ): Promise<Record<string, unknown> | null> {
    if (USE_IN_MEMORY) {
      const key = inMemoryKey(weddingId, email);
      const entry = inMemoryStore.get(key);
      if (!entry || entry.otp !== otp || entry.expiresAt < Date.now()) return null;
      inMemoryStore.delete(key);
      return entry.guestData;
    }
    const docId = docIdFromEmail(email);
    const docRef = getOtpCollection(weddingId).doc(docId);
    return db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return null;

      const data = doc.data();
      if (!data || data.otp !== otp) return null;

      const expiresAt = data.expiresAt?.toDate?.() ?? new Date(0);
      if (expiresAt < new Date()) return null;

      transaction.delete(docRef);
      return data.guestData as Record<string, unknown>;
    });
  },
};
