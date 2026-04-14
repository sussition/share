import type { Env, StoredSecret, StoredLink } from './types';

export const SECRET_PREFIX = 'secret:';
export const LINK_PREFIX = 'link:';

export type SecretResult =
  | { ok: true; stored: StoredSecret; key: string }
  | { ok: false; status: 404 | 410 };

export async function getSecret(id: string, env: Env): Promise<SecretResult> {
  const key = `${SECRET_PREFIX}${id}`;
  const raw = await env.SECRETS.get(key);
  if (!raw) return { ok: false, status: 404 };

  const stored: StoredSecret = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  if (now >= stored.e) {
    await env.SECRETS.delete(key);
    return { ok: false, status: 410 };
  }

  return { ok: true, stored, key };
}

export type LinkResult =
  | { ok: true; stored: StoredLink; key: string }
  | { ok: false; status: 404 };

export async function getLink(slug: string, env: Env): Promise<LinkResult> {
  const key = `${LINK_PREFIX}${slug}`;
  const raw = await env.SECRETS.get(key);
  if (!raw) return { ok: false, status: 404 };

  const stored: StoredLink = JSON.parse(raw);
  return { ok: true, stored, key };
}
