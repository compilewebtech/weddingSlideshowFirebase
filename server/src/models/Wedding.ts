import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Wedding as WeddingType } from '../types';

const db = getFirestore();
const weddingsCollection = db.collection('weddings');

export const WeddingModel = {
  async findAll(): Promise<WeddingType[]> {
    const snapshot = await weddingsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    })) as WeddingType[];
  },

  async findById(id: string): Promise<WeddingType | null> {
    const doc = await weddingsCollection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    } as WeddingType;
  },

  async findByUser(uid: string): Promise<WeddingType[]> {
    const snapshot = await weddingsCollection
      .where('createdBy', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    }) as WeddingType[];
  },

  async create(uid: string, data: Omit<WeddingType, 'id' | 'createdBy' | 'createdAt'>): Promise<WeddingType> {
    const docRef = await weddingsCollection.add({
      ...data,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    const created = await this.findById(docRef.id);
    return created!;
  },

  async update(id: string, uid: string, data: Partial<Omit<WeddingType, 'id' | 'createdBy' | 'createdAt'>>): Promise<WeddingType | null> {
    const docRef = weddingsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const existing = doc.data()!;
    if (existing.createdBy !== uid) return null;
    await docRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    return this.findById(id);
  },

  async delete(id: string, uid: string): Promise<boolean> {
    const docRef = weddingsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    if (doc.data()!.createdBy !== uid) return false;
    const guestsSnap = await docRef.collection('guests').get();
    const batch = db.batch();
    guestsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(docRef);
    await batch.commit();
    return true;
  },
};
