import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

/**
 * Vite dev-server plugin that executes Vercel-style serverless handlers
 * located in the project root `api/` directory. This makes /api/save-ips,
 * /api/list-ips, /api/load-ips and /api/market-data work during local dev.
 */
function apiRoutesPlugin() {
  return {
    name: 'api-routes',
    configureServer(server: ViteDevServer) {
      const projectRoot = server.config.root
      server.middlewares.use('/api', async (req: any, res: any, next: any) => {
        // Polyfill Express-style response helpers for Vercel-style handlers.
        if (!res.status) {
          res.status = (code: number) => {
            res.statusCode = code
            return res
          }
        }
        if (!res.json) {
          res.json = (data: unknown) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return res
          }
        }
        if (!res.send) {
          res.send = (data: unknown) => {
            res.end(data)
            return res
          }
        }
        // Skip the Angel One proxy (handled by Vite's proxy config).
        if (req.url?.startsWith('/angelone')) {
          return next()
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`)
        const routeName = url.pathname.replace(/^\/(api\/)?/, '').split('?')[0]
        req.query = Object.fromEntries(url.searchParams)
        const handlerPath = resolve(projectRoot, 'api', `${routeName}.js`)

        try {
          const mod = await import(pathToFileURL(handlerPath).href)
          const handler = mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'API handler not found or invalid' }))
            return
          }

          // Collect request body for POST requests.
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => (body += chunk))
            req.on('end', () => {
              try {
                req.body = body ? JSON.parse(body) : {}
              } catch {
                req.body = {}
              }
              handler(req, res)
            })
          } else {
            handler(req, res)
          }
        } catch (err) {
          // If the handler file doesn't exist, fall through to Vite's default handling.
          if ((err as any).code === 'ENOENT') {
            return next()
          }
          console.error('API route error:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Internal server error' }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiRoutesPlugin(),
  ],
  server: {
    proxy: {
      '/api/angelone': {
        target: 'https://apiconnect.angelone.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/angelone/, ''),
      },
    },
  },
})
