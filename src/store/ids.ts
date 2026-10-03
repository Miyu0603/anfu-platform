/** One-time callout tokens. randomUUID needs a secure context, so fall back for plain-http LAN previews. */
export function newToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const newId = (prefix: string) => `${prefix}-${newToken().slice(0, 8)}`;
