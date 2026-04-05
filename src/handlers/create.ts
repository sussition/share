import type { Env, CreateRequest, StoredSecret } from '../types';
import { generateId } from '../crypto';
import { securityHeaders, checkRateLimit } from '../security';

export async function handleCreate(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(ip, env, 'create', 10))) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: securityHeaders(),
    });
  }

  let body: CreateRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: securityHeaders(),
    });
  }

  const maxPayload = parseInt(env.MAX_PAYLOAD_BYTES);
  const maxTtl = parseInt(env.MAX_TTL_SECONDS);
  const maxViews = parseInt(env.MAX_VIEWS);

  if (!body.c || typeof body.c !== 'string' || body.c.length > maxPayload) {
    return new Response(JSON.stringify({ error: 'invalid_ciphertext' }), {
      status: 400,
      headers: securityHeaders(),
    });
  }

  if (!Number.isInteger(body.v) || (body.v !== -1 && (body.v < 1 || body.v > maxViews))) {
    return new Response(JSON.stringify({ error: 'invalid_views' }), {
      status: 400,
      headers: securityHeaders(),
    });
  }

  if (!Number.isInteger(body.ttl) || body.ttl < 300 || body.ttl > maxTtl) {
    return new Response(JSON.stringify({ error: 'invalid_ttl' }), {
      status: 400,
      headers: securityHeaders(),
    });
  }

  const id = generateId();
  const expiresAt = Math.floor(Date.now() / 1000) + body.ttl;

  const stored: StoredSecret = {
    c: body.c,
    v: body.v,
    e: expiresAt,
  };

  await env.SECRETS.put(`secret:${id}`, JSON.stringify(stored), {
    expirationTtl: body.ttl,
  });

  return new Response(JSON.stringify({ id, expires: expiresAt }), {
    status: 201,
    headers: securityHeaders(),
  });
}
