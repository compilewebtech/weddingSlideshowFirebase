import { apiFetch } from '../hooks/useApi';
import type { Guest } from '../types';

const isDev = import.meta.env.DEV;
const API_URL = isDev ? '' : 'https://us-central1-wedding-invitation-slideshow.cloudfunctions.net/api';

export interface RsvpFormData {
  name: string;
  email: string;
  attending: 'yes' | 'no';
  numberOfGuests: number;
  guestNames?: string[];
  guestAttending?: ('yes' | 'no')[];
  dietaryRestrictions?: string;
  message?: string;
}

async function rsvpFetch(url: string, options: RequestInit): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : (API_URL ? `${API_URL}${url.startsWith('/') ? '' : '/'}${url}` : url);
  if (!fullUrl.startsWith('http') && !fullUrl.startsWith('/')) {
    throw new Error('API URL not configured.');
  }
  try {
    return await fetch(fullUrl, options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new Error(
        'Cannot reach the API. Make sure the Firebase emulator is running: cd server && npm run serve'
      );
    }
    throw err;
  }
}

function apiPath(path: string): string {
  return API_URL ? `${API_URL}${path}` : `/api${path}`;
}

export async function sendOtp(weddingId: string, data: RsvpFormData): Promise<void> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/send-otp`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error || res.statusText || 'Failed to send verification code';
    const debug = json.debug ? ` (${json.debug})` : '';
    throw new Error(msg + debug);
  }
}

export async function resetOtp(weddingId: string, email: string): Promise<void> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/reset-otp/${encodeURIComponent(email)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Failed to reset OTP');
  }
}

export async function verifyOtp(
  weddingId: string,
  email: string,
  otp: string
): Promise<{ id: string }> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/verify-otp`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error || res.statusText || 'Failed to confirm RSVP';
    const debug = json.debug ? ` (${json.debug})` : '';
    throw new Error(msg + debug);
  }
  return json;
}

/** Silver direct RSVP — no OTP, email optional */
export async function submitDirectRsvp(weddingId: string, data: Omit<RsvpFormData, 'email'> & { email?: string }): Promise<{ id: string }> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/rsvp-direct`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit RSVP');
  }
  return json;
}

// ============================================================
// Gold Package API Functions
// ============================================================

/** Gold: Fetch guests by personalized token (public, no auth) */
export async function fetchGuestsByToken(
  weddingId: string,
  token: string
): Promise<{ guests: Guest[]; alreadyResponded: boolean }> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/by-token/${encodeURIComponent(token)}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Failed to load invitation');
  }
  return json;
}

/** Gold: Submit RSVP for a group/individual (public, no auth) */
export async function submitGoldRsvp(
  weddingId: string,
  data: {
    guestToken: string;
    responses: Array<{ guestId: string; attending: 'yes' | 'no' }>;
    email?: string;
    dietaryRestrictions?: string;
    message?: string;
  }
): Promise<void> {
  const res = await rsvpFetch(apiPath(`/weddings/${weddingId}/guests/rsvp-gold`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit RSVP');
  }
}

/** Gold: Upload guest Excel file (auth required) */
export async function uploadGuestExcel(
  weddingId: string,
  file: File
): Promise<{ added: number; preserved: number; removed: number; total: number; guests: Guest[] }> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return apiFetch(`/weddings/${weddingId}/guests/upload-excel`, {
    method: 'POST',
    body: JSON.stringify({ fileBase64: base64 }),
  });
}

/** Gold: Add one or more guests manually (auth required).
 *  Multiple guests are auto-grouped with a shared link. */
export async function addGoldGuest(
  weddingId: string,
  data: { guests: Array<{ firstName: string; lastName: string }>; groupId?: string }
): Promise<Guest[]> {
  return apiFetch(`/weddings/${weddingId}/guests/add-guest`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Gold: Group guests under one shared link (auth required) */
export async function groupGuests(
  weddingId: string,
  guestIds: string[]
): Promise<{ groupId: string; guestToken: string; guests: Guest[] }> {
  return apiFetch(`/weddings/${weddingId}/guests/group`, {
    method: 'POST',
    body: JSON.stringify({ guestIds }),
  });
}

/** Gold: Ungroup guests into individual links (auth required) */
export async function ungroupGuests(
  weddingId: string,
  guestIds: string[]
): Promise<{ guests: Guest[] }> {
  return apiFetch(`/weddings/${weddingId}/guests/ungroup`, {
    method: 'POST',
    body: JSON.stringify({ guestIds }),
  });
}
