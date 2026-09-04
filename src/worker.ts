interface Env {
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve static market data fallback
    if (url.pathname === '/api/market-data' || url.pathname === '/api/market-status') {
      const dataUrl = new URL('/data/market-data.json', request.url);
      if (env?.ASSETS?.fetch) {
        return env.ASSETS.fetch(new Request(dataUrl.toString(), request));
      }
      return fetch(dataUrl.toString());
    }

    // Serve static assets from compiled dist directory with SPA fallback
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    // Direct fetch fallback
    try {
      return await fetch(request);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  },
};
