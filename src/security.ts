import type { Env } from './types';

export function securityHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Content-Security-Policy':
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src https://sussition.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export function htmlHeaders(): HeadersInit {
  const headers = securityHeaders() as Record<string, string>;
  return { ...headers, 'Content-Type': 'text/html; charset=utf-8' };
}

export async function checkRateLimit(
  ip: string,
  env: Env,
  action: string,
  limit: number
): Promise<boolean> {
  const key = `rate:${action}:${ip}`;
  const current = parseInt((await env.SECRETS.get(key)) || '0');
  if (current >= limit) return false;
  await env.SECRETS.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}
