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

/** Check if the stored hash matches the wedding's actual passwordHash */
export function isWeddingAuthenticated(weddingId: string, passwordHash?: string): boolean {
  const stored = sessionStorage.getItem(getWeddingAuthKey(weddingId));
  if (!stored || !passwordHash) return false;
  return stored === passwordHash;
}

export function setWeddingAuthenticated(weddingId: string, hash: string) {
  sessionStorage.setItem(getWeddingAuthKey(weddingId), hash);
}

export function clearWeddingAuth(weddingId: string) {
  sessionStorage.removeItem(getWeddingAuthKey(weddingId));
}
