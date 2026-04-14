import type { Env } from '../types';
import { jsonError, jsonOk, checkRateLimit } from '../security';
import { getSecret } from '../kv';

export async function handleRetrieve(id: string, env: Env, request: Request): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(ip, env, 'retrieve', 30))) {
    return jsonError('rate_limited', 429);
  }

  const result = await getSecret(id, env);
  if (!result.ok) {
    return jsonError(result.status === 410 ? 'expired' : 'not_found', result.status);
  }

  const { stored, key } = result;
  const now = Math.floor(Date.now() / 1000);
  let remaining: number;

  if (stored.v === 1) {
    await env.SECRETS.delete(key);
    remaining = 0;
  } else if (stored.v > 1) {
    stored.v--;
    remaining = stored.v;
    await env.SECRETS.put(key, JSON.stringify(stored), {
      expirationTtl: stored.e - now,
    });
  } else {
    remaining = -1;
  }

  return jsonOk({ c: stored.c, remaining });
}
