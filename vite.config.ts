import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { existsSync } from 'fs'

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

        const sendError = (status: number, message: string) => {
          if (res.headersSent) return
          res.status(status).json({ error: message })
        }

        try {
          // Skip the Angel One proxy (handled by Vite's proxy config).
          if (req.url?.startsWith('/angelone')) {
            return next()
          }

          const url = new URL(req.url || '/', `http://${req.headers.host}`)
          const routeName = url.pathname.replace(/^\/(api\/)?/, '').split('?')[0]
          req.query = Object.fromEntries(url.searchParams)
          const handlerPath = resolve(projectRoot, 'api', `${routeName}.js`)

          if (!routeName || !existsSync(handlerPath)) {
            return sendError(404, 'API handler not found')
          }

          // Append a cache-busting query so edits to api/ files are reloaded per request.
          const mod = await import(`${pathToFileURL(handlerPath).href}?t=${Date.now()}`)
          const handler = mod.default
          if (typeof handler !== 'function') {
            return sendError(500, 'API handler not found or invalid')
          }

          // Collect request body for POST requests.
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => (body += chunk))
            req.on('end', () => {
              try {
                req.body = body ? JSON.parse(body) : {}
              } catch {
                return sendError(400, 'Invalid JSON body')
              }
              Promise.resolve(handler(req, res)).catch((err) => {
                console.error('API handler error:', err)
                sendError(500, 'Internal server error')
              })
            })
            req.on('error', (err: Error) => {
              console.error('Request body error:', err)
              sendError(400, 'Failed to read request body')
            })
          } else {
            Promise.resolve(handler(req, res)).catch((err) => {
              console.error('API handler error:', err)
              sendError(500, 'Internal server error')
            })
          }
        } catch (err) {
          console.error('API route error:', err)
          sendError(500, 'Internal server error')
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
