import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Guest } from '../types';
import * as XLSX from 'xlsx';
import { groupGuests as apiGroupGuests, ungroupGuests as apiUngroupGuests, uploadGuestExcel as apiUploadExcel, addGoldGuest as apiAddGoldGuest } from '../services/rsvpApi';
import { apiFetch } from './useApi';

interface GuestStats {
  totalGuests: number;
  attending: number;
  notAttending: number;
  pending: number;
  pendingCount: number;
  totalPeople: number;
  totalGuestsAttending: number;
  totalInvited: number;
}

interface UseGuestsResult {
  guests: Guest[];
  loading: boolean;
  error: string | null;
  addGuest: (guest: Omit<Guest, 'id' | 'submittedAt'>) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  exportToExcel: () => void;
  stats: GuestStats;
  groupSelectedGuests: (guestIds: string[]) => Promise<void>;
  ungroupSelectedGuests: (guestIds: string[]) => Promise<void>;
  uploadExcel: (file: File) => Promise<{ added: number; preserved: number; removed: number }>;
  addGoldGuest: (data: { guests: Array<{ firstName: string; lastName: string }>; groupId?: string }) => Promise<void>;
  downloadTemplate: () => void;
  refetch: () => void;
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

  const fetchGuests = useCallback(async () => {
    if (!weddingId) {
      setGuests([]);
      return;
    }
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
        .sort((a, b) => {
          // Sort pending last, then by submittedAt
          if (a.attending === 'pending' && b.attending !== 'pending') return 1;
          if (a.attending !== 'pending' && b.attending === 'pending') return -1;
          return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
        });
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
  }, [weddingId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

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
        await apiFetch(`/weddings/${weddingId}/guests/${id}`, { method: 'DELETE' });
        // Refetch to get updated tokens for remaining group members
        await fetchGuests();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete guest');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId, fetchGuests]
  );

  const stats: GuestStats = (() => {
    let attending = 0;
    let notAttending = 0;
    let pending = 0;
    let pendingCount = 0;
    let totalInvited = 0;
    let totalGuestsAttending = 0;

    for (const g of guests) {
      if (g.guestAttending?.length) {
        // Multi-guest Silver: count each individual guest
        const yesCount = g.guestAttending.filter((a) => a === 'yes').length;
        const noCount = g.guestAttending.filter((a) => a === 'no').length;
        attending += yesCount;
        notAttending += noCount;
        totalInvited += g.guestAttending.length;
        totalGuestsAttending += yesCount;
      } else if (g.attending === 'yes') {
        attending++;
        totalInvited++;
        totalGuestsAttending += g.numberOfGuests || 1;
      } else if (g.attending === 'no') {
        notAttending++;
        totalInvited++;
      } else if (g.attending === 'maybe') {
        pending++;
        totalInvited++;
      } else if (g.attending === 'pending') {
        pendingCount++;
        totalInvited++;
      }
    }

    return {
      totalGuests: guests.length,
      attending,
      notAttending,
      pending,
      pendingCount,
      totalPeople: totalGuestsAttending,
      totalGuestsAttending,
      totalInvited,
    };
  })();

  const exportToExcel = useCallback(() => {
    const guestRows: Record<string, string | number>[] = [];
    let rowNum = 1;

    for (const guest of guests) {
      if (guest.guestAttending?.length && guest.guestNames?.length) {
        // Multi-guest: expand each individual guest into their own row
        for (let i = 0; i < guest.guestNames.length; i++) {
          guestRows.push({
            '#': rowNum++,
            Name: guest.guestNames[i] || '',
            Email: i === 0 ? (guest.email || '') : '',
            Attending: guest.guestAttending[i] === 'yes' ? 'Yes' : 'No',
            'Dietary Restrictions': i === 0 ? (guest.dietaryRestrictions || '') : '',
            Message: i === 0 ? (guest.message || '') : '',
            'Submitted At': i === 0 && guest.submittedAt
              ? new Date(guest.submittedAt).toLocaleString()
              : '',
          });
        }
      } else {
        guestRows.push({
          '#': rowNum++,
          Name: guest.firstName ? `${guest.firstName} ${guest.lastName || ''}` : guest.name,
          Email: guest.email || '',
          Attending:
            guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : guest.attending === 'pending' ? 'Pending' : 'Maybe',
          'Dietary Restrictions': guest.dietaryRestrictions || '',
          Message: guest.message || '',
          'Submitted At': guest.submittedAt
            ? new Date(guest.submittedAt).toLocaleString()
            : '',
        });
      }
    }

    const empty = { '#': '', Name: '', Email: '', Attending: '', 'Dietary Restrictions': '', Message: '', 'Submitted At': '' };
    const statsRows = [
      { ...empty },
      { ...empty, '#': '', Name: 'Summary', Email: '', Attending: '' },
      { ...empty, Name: 'Total Invited', Attending: String(stats.totalInvited) },
      { ...empty, Name: 'Attending', Attending: String(stats.attending) },
      { ...empty, Name: 'Declined', Attending: String(stats.notAttending) },
      { ...empty, Name: 'Total Guests Attending', Attending: String(stats.totalGuestsAttending) },
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

  const groupSelectedGuests = useCallback(
    async (guestIds: string[]) => {
      if (!weddingId) return;
      setLoading(true);
      setError(null);
      try {
        await apiGroupGuests(weddingId, guestIds);
        await fetchGuests();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to group guests');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId, fetchGuests]
  );

  const ungroupSelectedGuests = useCallback(
    async (guestIds: string[]) => {
      if (!weddingId) return;
      setLoading(true);
      setError(null);
      try {
        await apiUngroupGuests(weddingId, guestIds);
        await fetchGuests();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to ungroup guests');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId, fetchGuests]
  );

  const uploadExcel = useCallback(
    async (file: File) => {
      if (!weddingId) throw new Error('No wedding selected');
      setLoading(true);
      setError(null);
      try {
        const result = await apiUploadExcel(weddingId, file);
        await fetchGuests();
        return { added: result.added, preserved: result.preserved, removed: result.removed };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload Excel');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId, fetchGuests]
  );

  const addGoldGuest = useCallback(
    async (data: { guests: Array<{ firstName: string; lastName: string }>; groupId?: string }) => {
      if (!weddingId) throw new Error('No wedding selected');
      setLoading(true);
      setError(null);
      try {
        await apiAddGoldGuest(weddingId, data);
        await fetchGuests();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add guest');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [weddingId, fetchGuests]
  );

  const downloadTemplate = useCallback(() => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['First Name', 'Last Name'],
      [''],
      ['John', 'Doe'],
      ['Jane', 'Doe'],
      [''],
      ['Mike', 'Smith'],
      [''],
      ['Alice', 'Johnson'],
      ['Bob', 'Johnson'],
      ['Charlie', 'Johnson'],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    // Add instructions sheet
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['How to fill the guest list'],
      [''],
      ['1. Enter each guest\'s First Name and Last Name'],
      ['2. Leave a BLANK ROW between different groups/families'],
      ['3. Guests listed together (no blank row between) will share one invite link'],
      ['4. A single guest between blank rows gets their own individual link'],
      [''],
      ['Example:'],
      ['  John Doe     ┐'],
      ['  Jane Doe     ┘ → These two share one link'],
      ['  (blank row)'],
      ['  Mike Smith   → Solo, gets his own link'],
      ['  (blank row)'],
      ['  Alice Johnson  ┐'],
      ['  Bob Johnson    │ → These three share one link'],
      ['  Charlie Johnson┘'],
    ]);
    instrWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');
    XLSX.writeFile(wb, 'guest-template.xlsx');
  }, []);

  return {
    guests, loading, error, addGuest, deleteGuest, exportToExcel, stats,
    groupSelectedGuests, ungroupSelectedGuests, uploadExcel, addGoldGuest, downloadTemplate, refetch: fetchGuests,
  };
}
