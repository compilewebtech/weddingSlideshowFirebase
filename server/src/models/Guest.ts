import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

export interface GuestDoc {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: 'yes' | 'no' | 'maybe';
  numberOfGuests: number;
  message?: string;
  dietaryRestrictions?: string;
  submittedAt: string;
  createdAt: Timestamp;
}

function getGuestsCollection(weddingId: string) {
  return db.collection('weddings').doc(weddingId).collection('guests');
}

export const GuestModel = {
  async findAll(weddingId: string): Promise<GuestDoc[]> {
    const snapshot = await getGuestsCollection(weddingId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GuestDoc[];
  },

  async create(weddingId: string, data: Omit<GuestDoc, 'id' | 'createdAt'>): Promise<GuestDoc> {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Omit<GuestDoc, 'id' | 'createdAt'>;
    const docRef = await getGuestsCollection(weddingId).add({
      ...clean,
      createdAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    } as GuestDoc;
  },

  async deleteById(weddingId: string, id: string): Promise<boolean> {
    const docRef = getGuestsCollection(weddingId).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  },

  async findById(weddingId: string, id: string): Promise<GuestDoc | null> {
    const doc = await getGuestsCollection(weddingId).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as GuestDoc;
  },

  async findByEmail(weddingId: string, email: string): Promise<GuestDoc | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    const snapshot = await getGuestsCollection(weddingId)
      .where('email', '==', normalized)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as GuestDoc;
  },
};
