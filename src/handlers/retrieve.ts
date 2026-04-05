import type { Env, StoredSecret } from '../types';
import { securityHeaders, checkRateLimit } from '../security';

export async function handleRetrieve(id: string, env: Env, request: Request): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(ip, env, 'retrieve', 30))) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: securityHeaders(),
    });
  }

  const raw = await env.SECRETS.get(`secret:${id}`);
  if (!raw) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: securityHeaders(),
    });
  }

  const stored: StoredSecret = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);

  if (now >= stored.e) {
    await env.SECRETS.delete(`secret:${id}`);
    return new Response(JSON.stringify({ error: 'expired' }), {
      status: 410,
      headers: securityHeaders(),
    });
  }

  let remaining: number;

  if (stored.v === 1) {
    // Last view — delete
    await env.SECRETS.delete(`secret:${id}`);
    remaining = 0;
  } else if (stored.v > 1) {
    // Decrement and write back with remaining TTL
    stored.v--;
    remaining = stored.v;
    const remainingTtl = stored.e - now;
    await env.SECRETS.put(`secret:${id}`, JSON.stringify(stored), {
      expirationTtl: remainingTtl,
    });
  } else {
    // v === -1, unlimited
    remaining = -1;
  }

  return new Response(JSON.stringify({ c: stored.c, remaining }), {
    status: 200,
    headers: securityHeaders(),
  });
}
