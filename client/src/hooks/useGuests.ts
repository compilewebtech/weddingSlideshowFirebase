import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Guest } from '../types';
import * as XLSX from 'xlsx';

interface GuestStats {
  totalGuests: number;
  attending: number;
  notAttending: number;
  pending: number;
  totalPeople: number;
  totalGuestsAttending: number;
}

interface UseGuestsResult {
  guests: Guest[];
  loading: boolean;
  error: string | null;
  addGuest: (guest: Omit<Guest, 'id' | 'submittedAt'>) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  exportToExcel: () => void;
  stats: GuestStats;
}

function getStorageKey(weddingId: string) {
  return `wedding_guests_${weddingId}`;
}

function guestsCollection(weddingId: string) {
  return collection(db, 'weddings', weddingId, 'guests');
}

export function useGuests(weddingId: string | null): UseGuestsResult {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weddingId) {
      setGuests([]);
      return;
    }
    const fetchGuests = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(guestsCollection(weddingId));
        const data = snapshot.docs
          .map((d) => {
            const g = d.data();
            const createdAt = g.createdAt as { toDate?: () => Date };
            return {
              id: d.id,
              ...g,
              submittedAt: g.submittedAt || createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            } as Guest;
          })
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setGuests(data);
        localStorage.setItem(getStorageKey(weddingId), JSON.stringify(data));
      } catch (err) {
        console.warn('⚠️ Failed to fetch guests:', err);
        const cached = localStorage.getItem(getStorageKey(weddingId));
        if (cached) setGuests(JSON.parse(cached));
        setError(err instanceof Error ? err.message : 'Failed to fetch guests');
      } finally {
        setLoading(false);
      }
    };
    fetchGuests();
  }, [weddingId]);

  const addGuest = useCallback(
    async (guestData: Omit<Guest, 'id' | 'submittedAt'>) => {
      if (!weddingId) throw new Error('No wedding selected');
      setLoading(true);
      setError(null);
      try {
        const docRef = await addDoc(guestsCollection(weddingId), {
          ...guestData,
          submittedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
        });
        const newGuest: Guest = {
          ...guestData,
          id: docRef.id,
          submittedAt: new Date().toISOString(),
        };
        setGuests((prev) => {
          const updated = [newGuest, ...prev];
          localStorage.setItem(getStorageKey(weddingId), JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save guest';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId]
  );

  const deleteGuest = useCallback(
    async (id: string) => {
      if (!weddingId) return;
      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, 'weddings', weddingId, 'guests', id));
        setGuests((prev) => {
          const updated = prev.filter((g) => g.id !== id);
          localStorage.setItem(getStorageKey(weddingId), JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete guest');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId]
  );

  const stats: GuestStats = {
    totalGuests: guests.length,
    attending: guests.filter((g) => g.attending === 'yes').length,
    notAttending: guests.filter((g) => g.attending === 'no').length,
    pending: guests.filter((g) => g.attending === 'maybe').length,
    totalPeople: guests
      .filter((g) => g.attending === 'yes')
      .reduce((sum, g) => sum + (g.numberOfGuests || 1), 0),
    totalGuestsAttending: guests
      .filter((g) => g.attending === 'yes')
      .reduce((sum, g) => sum + (g.numberOfGuests || 1), 0),
  };

  const exportToExcel = useCallback(() => {
    const guestRows = guests.map((guest, index) => ({
      '#': index + 1,
      Name: guest.name,
      Email: guest.email || 'N/A',
      Phone: guest.phone || 'N/A',
      Attending:
        guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : 'Maybe',
      'Number of Guests': guest.numberOfGuests || 1,
      Message: guest.message || '',
      'Submitted At': guest.submittedAt
        ? new Date(guest.submittedAt).toLocaleString()
        : 'N/A',
    }));

    const statsRows = [
      { '#': '', Name: '', Email: '', Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
      { '#': '', Name: 'Total RSVPs', Email: stats.totalGuests, Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
      { '#': '', Name: 'Attending', Email: stats.attending, Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
      { '#': '', Name: 'Not Attending', Email: stats.notAttending, Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
      { '#': '', Name: 'Maybe', Email: stats.pending, Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
      { '#': '', Name: 'Total Guests Attending', Email: stats.totalGuestsAttending, Phone: '', Attending: '', 'Number of Guests': '', Message: '', 'Submitted At': '' },
    ];

    const exportData = [...guestRows, ...statsRows];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...exportData.map((row) => String((row as Record<string, unknown>)[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    XLSX.writeFile(wb, `wedding-guests-${weddingId}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [guests, stats, weddingId]);

  return { guests, loading, error, addGuest, deleteGuest, exportToExcel, stats };
}
