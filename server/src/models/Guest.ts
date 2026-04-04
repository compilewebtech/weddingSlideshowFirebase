import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

export interface GuestDoc {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: 'yes' | 'no' | 'maybe' | 'pending';
  numberOfGuests: number;
  guestNames?: string[];
  message?: string;
  dietaryRestrictions?: string;
  submittedAt: string;
  createdAt: Timestamp;

  /** Gold package fields */
  firstName?: string;
  lastName?: string;
  groupId?: string;
  guestToken?: string;
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

  /** Gold: batch-create multiple guest docs from Excel upload */
  async createBatch(
    weddingId: string,
    guests: Array<{ firstName: string; lastName: string; guestToken: string; groupId?: string }>
  ): Promise<GuestDoc[]> {
    const col = getGuestsCollection(weddingId);
    const created: GuestDoc[] = [];

    // Firestore batch limit is 500 operations
    const batchSize = 450;
    for (let i = 0; i < guests.length; i += batchSize) {
      const chunk = guests.slice(i, i + batchSize);
      const batch = db.batch();
      const refs: FirebaseFirestore.DocumentReference[] = [];

      for (const g of chunk) {
        const ref = col.doc();
        refs.push(ref);
        batch.set(ref, {
          firstName: g.firstName,
          lastName: g.lastName,
          name: `${g.firstName} ${g.lastName}`,
          guestToken: g.guestToken,
          groupId: g.groupId || ref.id,
          attending: 'pending',
          numberOfGuests: 1,
          submittedAt: '',
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      for (const ref of refs) {
        const doc = await ref.get();
        created.push({ id: doc.id, ...doc.data() } as GuestDoc);
      }
    }

    return created;
  },

  /** Gold: find guests by personalized token */
  async findByToken(weddingId: string, token: string): Promise<GuestDoc[]> {
    const snapshot = await getGuestsCollection(weddingId)
      .where('guestToken', '==', token)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as GuestDoc[];
  },

  /** Gold: find all guests in a group */
  async findByGroupId(weddingId: string, groupId: string): Promise<GuestDoc[]> {
    const snapshot = await getGuestsCollection(weddingId)
      .where('groupId', '==', groupId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as GuestDoc[];
  },

  /** Gold: update attendance and shared fields for a guest */
  async updateAttendance(
    weddingId: string,
    guestId: string,
    data: {
      attending: 'yes' | 'no';
      email?: string;
      dietaryRestrictions?: string;
      message?: string;
      submittedAt: string;
    }
  ): Promise<void> {
    const docRef = getGuestsCollection(weddingId).doc(guestId);
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
    );
    await docRef.update(clean);
  },

  /** Gold: delete all pending guests not in the provided keepIds set */
  async deletePendingNotInList(weddingId: string, keepIds: Set<string>): Promise<number> {
    const snapshot = await getGuestsCollection(weddingId)
      .where('attending', '==', 'pending')
      .get();

    const toDelete = snapshot.docs.filter((doc) => !keepIds.has(doc.id));
    if (toDelete.length === 0) return 0;

    const batchSize = 450;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const chunk = toDelete.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return toDelete.length;
  },

  /** Gold: set groupId and shared guestToken on multiple guests */
  async updateGroupId(
    weddingId: string,
    guestIds: string[],
    groupId: string,
    guestToken: string
  ): Promise<void> {
    const col = getGuestsCollection(weddingId);
    const batchSize = 450;
    for (let i = 0; i < guestIds.length; i += batchSize) {
      const chunk = guestIds.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach((id) => {
        batch.update(col.doc(id), { groupId, guestToken });
      });
      await batch.commit();
    }
  },

  /** Gold: ungroup guests — reset each to their own groupId with a new individual token */
  async removeGroupId(
    weddingId: string,
    guestTokenMap: Map<string, string>
  ): Promise<void> {
    const col = getGuestsCollection(weddingId);
    const entries = Array.from(guestTokenMap.entries());
    const batchSize = 450;
    for (let i = 0; i < entries.length; i += batchSize) {
      const chunk = entries.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach(([id, token]) => {
        batch.update(col.doc(id), { groupId: id, guestToken: token });
      });
      await batch.commit();
    }
  },
};
