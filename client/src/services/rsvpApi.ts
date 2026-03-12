const isDev = import.meta.env.DEV;
const API_URL = isDev ? '' : 'https://us-central1-wedding-invitation-slideshow.cloudfunctions.net/api';

export interface RsvpFormData {
  name: string;
  email: string;
  attending: 'yes' | 'no' | 'maybe';
  numberOfGuests: number;
  dietaryRestrictions?: string;
  message?: string;
}

async function rsvpFetch(url: string, options: RequestInit): Promise<Response> {
  const fullUrl = API_URL ? `${API_URL}${url.startsWith('/') ? '' : '/'}${url}` : url;
  if (!fullUrl.startsWith('http') && !fullUrl.startsWith('/')) {
    throw new Error(
      'API URL not configured. Set VITE_API_URL in .env.local for production builds.'
    );
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
  return API_URL ? `${API_URL}/api${path}` : `/api${path}`;
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
