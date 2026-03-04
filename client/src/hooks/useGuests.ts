import { useState, useEffect, useCallback } from 'react';
import type { Guest } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'wedding_guests';
const API_URL = import.meta.env.VITE_API_URL || '';

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

export function useGuests(): UseGuestsResult {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuests = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/guests`);
        if (!response.ok) throw new Error('Failed to fetch guests');
        const data = await response.json();
        setGuests(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('⚠️ Backend unavailable, loading from cache:', err);
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          setGuests(JSON.parse(cached));
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch guests');
      } finally {
        setLoading(false);
      }
    };
    fetchGuests();
  }, []);

  const addGuest = useCallback(async (guestData: Omit<Guest, 'id' | 'submittedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save guest');
      }
      const newGuest = await response.json();

      setGuests(prev => {
        const updated = [...prev, newGuest];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add guest';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGuest = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/guests/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete guest');

      setGuests(prev => {
        const updated = prev.filter(g => g.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete guest');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportToExcel = useCallback(() => {
    const exportData = guests.map((guest, index) => ({
      '#': index + 1,
      'Name': guest.name,
      'Email': guest.email || 'N/A',
      'Phone': guest.phone || 'N/A',
      'Attending':
        guest.attending === 'yes'
          ? 'Yes'
          : guest.attending === 'no'
          ? 'No'
          : 'Maybe',
      'Number of Guests': guest.numberOfGuests || 1,
      'Message': guest.message || '',
      'Submitted At': guest.submittedAt
        ? new Date(guest.submittedAt).toLocaleString()
        : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...exportData.map(row => String((row as Record<string, unknown>)[key] || '').length)
      ) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    XLSX.writeFile(wb, `wedding-guests-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [guests]);

  // Stats
  const stats: GuestStats = {
    totalGuests: guests.length,
    attending: guests.filter(g => g.attending === 'yes').length,
    notAttending: guests.filter(g => g.attending === 'no').length,
    pending: guests.filter(g => g.attending === 'maybe').length,
    totalPeople: guests
      .filter(g => g.attending === 'yes')
      .reduce((sum, g) => sum + (g.numberOfGuests || 1), 0),
    totalGuestsAttending: guests
      .filter(g => g.attending === 'yes')
      .reduce((sum, g) => sum + (g.numberOfGuests || 1), 0),
  };

  return { guests, loading, error, addGuest, deleteGuest, exportToExcel, stats };
}
