import type { Env, CreateRequest, StoredSecret } from '../types';
import { generateId } from '../crypto';
import { jsonError, jsonOk, checkRateLimit } from '../security';
import { SECRET_PREFIX } from '../kv';

export async function handleCreate(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(ip, env, 'create', 10))) {
    return jsonError('rate_limited', 429);
  }

  let body: CreateRequest;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 400);
  }

  const maxPayload = parseInt(env.MAX_PAYLOAD_BYTES);
  const maxTtl = parseInt(env.MAX_TTL_SECONDS);
  const maxViews = parseInt(env.MAX_VIEWS);

  if (!body.c || typeof body.c !== 'string' || body.c.length > maxPayload) {
    return jsonError('invalid_ciphertext', 400);
  }

  if (!Number.isInteger(body.v) || (body.v !== -1 && (body.v < 1 || body.v > maxViews))) {
    return jsonError('invalid_views', 400);
  }

  if (!Number.isInteger(body.ttl) || body.ttl < 300 || body.ttl > maxTtl) {
    return jsonError('invalid_ttl', 400);
  }

  const id = generateId();
  const expiresAt = Math.floor(Date.now() / 1000) + body.ttl;

  const stored: StoredSecret = {
    c: body.c,
    v: body.v,
    e: expiresAt,
  };

  await env.SECRETS.put(`${SECRET_PREFIX}${id}`, JSON.stringify(stored), {
    expirationTtl: body.ttl,
  });

  return jsonOk({ id, expires: expiresAt }, 201);
}
