const SECRET = (import.meta.env.VITE_INVITE_SECRET || 'wedding-invite-2024').slice(0, 16).padEnd(16, '0');

function xorTransform(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length);
    result += String.fromCharCode(code & 0xff);
  }
  return result;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

export interface InviteParams {
  maxGuests: number;
}

export function encodeInviteParams(params: InviteParams): string {
  const json = JSON.stringify(params);
  const encoded = xorTransform(json);
  return base64UrlEncode(encoded);
}

export function decodeInviteParams(token: string): InviteParams | null {
  try {
    const decoded = base64UrlDecode(token);
    const decodedJson = xorTransform(decoded);
    const params = JSON.parse(decodedJson) as InviteParams;
    if (typeof params.maxGuests !== 'number' || params.maxGuests < 1 || params.maxGuests > 10) {
      return null;
    }
    return params;
  } catch {
    return null;
  }
}
