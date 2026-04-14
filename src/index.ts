import type { Env } from './types';
import { handleCreate } from './handlers/create';
import { handleRetrieve } from './handlers/retrieve';
import { handleCreateLink } from './handlers/createLink';
import { handleRedirect } from './handlers/redirect';
import { jsonError, jsonOk, htmlHeaders } from './security';
import { getSecret, getLink } from './kv';
import html from './app.html';

const RETRIEVE_RE = /^\/api\/secrets\/([a-zA-Z0-9_-]{22})$/;
const META_RE     = /^\/api\/secrets\/([a-zA-Z0-9_-]{22})\/meta$/;
const LINK_RE     = /^\/link\/([a-zA-Z0-9-]{3,32})$/;
const LINK_API_RE = /^\/api\/links\/([a-zA-Z0-9-]{3,32})$/;

async function handleMeta(id: string, env: Env): Promise<Response> {
  const result = await getSecret(id, env);
  if (!result.ok) {
    return jsonError(result.status === 410 ? 'expired' : 'not_found', result.status);
  }
  const { stored } = result;
  return jsonOk({ expires: stored.e, views: stored.v });
}

async function handleLinkInfo(slug: string, env: Env): Promise<Response> {
  const result = await getLink(slug, env);
  if (!result.ok) {
    return jsonError('not_found', 404);
  }
  const { stored } = result;
  return jsonOk({ url: stored.u, clicks: stored.c, created: stored.t });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ── Secret endpoints ──
    if (pathname === '/api/secrets' && method === 'POST') {
      return handleCreate(request, env);
    }

    const retrieveMatch = pathname.match(RETRIEVE_RE);
    if (retrieveMatch && method === 'GET') {
      return handleRetrieve(retrieveMatch[1], env, request);
    }

    const metaMatch = pathname.match(META_RE);
    if (metaMatch && method === 'GET') {
      return handleMeta(metaMatch[1], env);
    }

    // ── Link endpoints ──
    if (pathname === '/api/links' && method === 'POST') {
      return handleCreateLink(request, env);
    }

    const linkApiMatch = pathname.match(LINK_API_RE);
    if (linkApiMatch && method === 'GET') {
      return handleLinkInfo(linkApiMatch[1], env);
    }

    const linkMatch = pathname.match(LINK_RE);
    if (linkMatch && method === 'GET') {
      return handleRedirect(linkMatch[1], env, ctx);
    }

    // ── Health & fallback ──
    if (pathname === '/api/health' && method === 'GET') {
      return jsonOk({ status: 'ok' });
    }

    if (method === 'GET') {
      return new Response(html, { headers: htmlHeaders() });
    }

    return jsonError('not_found', 404);
  },
};
