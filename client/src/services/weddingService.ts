import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { hashPassword } from '../utils/password';
import type { Wedding } from '../types';

export async function createWedding(
  userId: string,
  data: Omit<Wedding, 'id' | 'createdBy' | 'createdAt'>
): Promise<Wedding> {
  const { password, passwordHash: _ph, ...rest } = data as Omit<Wedding, 'id' | 'createdBy' | 'createdAt'> & { password?: string };
  const payload: Record<string, unknown> = {
    ...rest,
    createdBy: userId,
    createdAt: serverTimestamp(),
  };
  if (password) {
    payload.passwordHash = await hashPassword(password);
  }
  const docRef = await addDoc(collection(db, 'weddings'), payload);

  const { password: _pw, ...safeData } = data as Omit<Wedding, 'id' | 'createdBy' | 'createdAt'> & { password?: string };
  return {
    id: docRef.id,
    ...safeData,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  } as Wedding;
}

export async function updateWedding(
  weddingId: string,
  userId: string,
  data: Partial<Omit<Wedding, 'id' | 'createdBy' | 'createdAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  if ('password' in data && typeof (data as { password?: string }).password === 'string') {
    const pw = (data as { password?: string }).password;
    payload.passwordHash = pw ? await hashPassword(pw) : null;
    delete (payload as { password?: string }).password;
  }
  const docRef = doc(db, 'weddings', weddingId);
  await updateDoc(docRef, payload);
}

export async function deleteWedding(weddingId: string): Promise<void> {
  const guestsRef = collection(db, 'weddings', weddingId, 'guests');
  const guestsSnap = await getDocs(guestsRef);
  await Promise.all(guestsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'weddings', weddingId));
}
