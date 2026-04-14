import type { Env, CreateLinkRequest, StoredLink } from '../types';
import { generateSlug } from '../crypto';
import { jsonError, jsonOk, checkRateLimit } from '../security';
import { LINK_PREFIX } from '../kv';

const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
const RESERVED = new Set(['api', 'link', 's', 'health']);

export async function handleCreateLink(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(ip, env, 'create_link', 5))) {
    return jsonError('rate_limited', 429);
  }

  let body: CreateLinkRequest;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 400);
  }

  if (!body.url || typeof body.url !== 'string') {
    return jsonError('invalid_url', 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return jsonError('invalid_url', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return jsonError('invalid_url', 400);
  }

  let slug: string;

  if (body.slug) {
    slug = body.slug;

    if (slug.length < 3 || slug.length > 32 || !SLUG_RE.test(slug)) {
      return jsonError('invalid_slug', 400);
    }

    if (RESERVED.has(slug.toLowerCase())) {
      return jsonError('invalid_slug', 400);
    }

    const existing = await env.SECRETS.get(`${LINK_PREFIX}${slug}`);
    if (existing) {
      return jsonError('slug_taken', 409);
    }
  } else {
    const MAX_ATTEMPTS = 5;
    let found = false;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      slug = generateSlug();
      if (!(await env.SECRETS.get(`${LINK_PREFIX}${slug}`))) {
        found = true;
        break;
      }
    }
    if (!found) {
      return jsonError('slug_generation_failed', 503);
    }
  }

  const stored: StoredLink = {
    u: body.url,
    t: Math.floor(Date.now() / 1000),
    c: 0,
  };

  await env.SECRETS.put(`${LINK_PREFIX}${slug}`, JSON.stringify(stored));

  const origin = new URL(request.url).origin;
  return jsonOk({ slug, short_url: `${origin}/link/${slug}` }, 201);
}
