import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const guestsCollection = db.collection('guests');

export interface GuestDoc {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  numberOfGuests: number;
  message?: string;
  submittedAt: string;
  createdAt: Timestamp;
}

export const GuestModel = {
  async findAll(): Promise<GuestDoc[]> {
    const snapshot = await guestsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as GuestDoc[];
  },

  async create(data: Omit<GuestDoc, 'id' | 'createdAt'>): Promise<GuestDoc> {
    const docRef = await guestsCollection.add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    } as GuestDoc;
  },

  async deleteById(id: string): Promise<boolean> {
    const docRef = guestsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  },

  async findById(id: string): Promise<GuestDoc | null> {
    const doc = await guestsCollection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as GuestDoc;
  },
};