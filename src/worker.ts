interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy Angel One SmartAPI requests to bypass browser CORS restrictions
    if (url.pathname.startsWith('/api/angelone/')) {
      const targetPath = url.pathname.replace(/^\/api\/angelone\//, '');
      const targetUrl = `https://apiconnect.angelone.in/${targetPath}${url.search}`;

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', 'apiconnect.angelone.in');
      newHeaders.delete('origin');
      newHeaders.delete('referer');

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      });

      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', '*');
      respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      respHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        headers: respHeaders,
      });
    }

    // Serve static market data fallback
    if (url.pathname === '/api/market-data' || url.pathname === '/api/market-status') {
      const dataUrl = new URL('/data/market-data.json', request.url);
      return env.ASSETS.fetch(new Request(dataUrl, request));
    }

    // Serve static assets from compiled dist directory with SPA fallback
    return env.ASSETS.fetch(request);
  },
};
