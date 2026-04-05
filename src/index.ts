import type { Env } from './types';
import { handleCreate } from './handlers/create';
import { handleRetrieve } from './handlers/retrieve';
import { securityHeaders, htmlHeaders } from './security';
import { getSecret } from './kv';
import html from './app.html';

const RETRIEVE_RE = /^\/api\/secrets\/([a-zA-Z0-9_-]{22})$/;
const META_RE     = /^\/api\/secrets\/([a-zA-Z0-9_-]{22})\/meta$/;

async function handleMeta(id: string, env: Env): Promise<Response> {
  const result = await getSecret(id, env);
  if (!result.ok) {
    const error = result.status === 410 ? 'expired' : 'not_found';
    return new Response(JSON.stringify({ error }), {
      status: result.status, headers: securityHeaders(),
    });
  }
  const { stored } = result;
  return new Response(JSON.stringify({ expires: stored.e, views: stored.v }), {
    status: 200, headers: securityHeaders(),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

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

    if (pathname === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: securityHeaders(),
      });
    }

    if (method === 'GET') {
      return new Response(html, { headers: htmlHeaders() });
    }

    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: securityHeaders(),
    });
  },
};
