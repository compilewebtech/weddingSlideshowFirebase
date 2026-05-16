// Same-origin in both dev (Vite proxy) and prod (Firebase Hosting /api/** rewrite to the `api` function)
const API_URL = '/api';

export function getAuthToken(): Promise<string | null> {
  return import('../lib/firebase').then(({ auth }) => {
    return auth.currentUser?.getIdToken() ?? null;
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
