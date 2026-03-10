export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(data))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getWeddingAuthKey(weddingId: string) {
  return `wedding_auth_${weddingId}`;
}

export function isWeddingAuthenticated(weddingId: string): boolean {
  return !!sessionStorage.getItem(getWeddingAuthKey(weddingId));
}

export function setWeddingAuthenticated(weddingId: string) {
  sessionStorage.setItem(getWeddingAuthKey(weddingId), '1');
}

export function clearWeddingAuth(weddingId: string) {
  sessionStorage.removeItem(getWeddingAuthKey(weddingId));
}
