import type { Env } from '../types';
import { getLink } from '../kv';
import { jsonError } from '../security';

export async function handleRedirect(
  slug: string,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const result = await getLink(slug, env);
  if (!result.ok) {
    return jsonError('not_found', 404);
  }

  const { stored, key } = result;

  ctx.waitUntil(
    env.SECRETS.put(key, JSON.stringify({ ...stored, c: stored.c + 1 })),
  );

  return Response.redirect(stored.u, 301);
}
