import type { Env } from './types';
import { handleCreate } from './handlers/create';
import { handleRetrieve } from './handlers/retrieve';
import { securityHeaders, htmlHeaders } from './security';
import html from './app.html';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (pathname === '/api/secrets' && method === 'POST') {
      return handleCreate(request, env);
    }

    const retrieveMatch = pathname.match(/^\/api\/secrets\/([a-zA-Z0-9_-]{22})$/);
    if (retrieveMatch && method === 'GET') {
      return handleRetrieve(retrieveMatch[1], env, request);
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
      status: 404,
      headers: securityHeaders(),
    });
  },
};
