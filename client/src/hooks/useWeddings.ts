import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Wedding } from '../types';

function docToWedding(id: string, data: Record<string, unknown>): Wedding {
  const createdAt = data.createdAt as { toDate?: () => Date };
  return {
    id,
    ...data,
    createdAt: createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  } as Wedding;
}

export function useWeddings() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeddings = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'weddings'));
        const all = snapshot.docs
          .map((d) => docToWedding(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWeddings(all);
      } catch (err) {
        console.error('Failed to fetch weddings:', err);
        setWeddings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWeddings();
  }, []);

  return { weddings, loading };
}

export function useWedding(id: string | null) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setWedding(null);
      setLoading(false);
      return;
    }
    const fetchWedding = async () => {
      setLoading(true);
      setError(null);
      try {
        const docSnap = await getDoc(doc(db, 'weddings', id));
        if (!docSnap.exists()) throw new Error('Wedding not found');
        setWedding(docToWedding(docSnap.id, docSnap.data() as Record<string, unknown>));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wedding');
        setWedding(null);
      } finally {
        setLoading(false);
      }
    };
    fetchWedding();
  }, [id]);

  return { wedding, loading, error };
}

export function useMyWeddings(userId: string | null) {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyWeddings = useCallback(async () => {
    if (!userId) {
      setWeddings([]);
      setLoading(false);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'weddings'));
      const all = snapshot.docs
        .map((d) => docToWedding(d.id, d.data() as Record<string, unknown>))
        .filter((w) => w.createdBy === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWeddings(all);
    } catch (err) {
      console.error('Failed to fetch my weddings:', err);
      setWeddings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchMyWeddings();
  }, [fetchMyWeddings]);

  return { weddings, loading, refetch: fetchMyWeddings };
}
