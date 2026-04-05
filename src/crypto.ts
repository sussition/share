// Generate 16 random bytes → base64url (22 chars, no padding)
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
