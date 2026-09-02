import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { existsSync } from 'fs'

/**
 * Vite dev-server plugin that emulates Netlify Functions located in
 * `netlify/functions/`. This makes /api/* routes work during local dev
 * without needing the Netlify CLI.
 */
function apiRoutesPlugin() {
  return {
    name: 'api-routes',
    configureServer(server: ViteDevServer) {
      const projectRoot = server.config.root
      server.middlewares.use('/api', async (req: any, res: any, next: any) => {
        // Skip the Angel One proxy (handled by Vite's proxy config).
        if (req.url?.startsWith('/angelone')) {
          return next()
        }

        const sendError = (status: number, message: string) => {
          if (res.headersSent) return
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }

        try {
          const url = new URL(req.url || '/', `http://${req.headers.host}`)
          const routeName = url.pathname.replace(/^\/(api\/)?/, '').split('?')[0]
          const handlerPath = resolve(projectRoot, 'netlify', 'functions', `${routeName}.js`)

          if (!routeName || !existsSync(handlerPath)) {
            return sendError(404, 'API handler not found')
          }

          const collectBody = () =>
            new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = []
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', () => resolve(Buffer.concat(chunks)))
              req.on('error', reject)
            })

          const body = ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : await collectBody()
          const request = new Request(url.href, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body,
          })

          // Append a cache-busting query so edits to function files are reloaded per request.
          const mod = await import(`${pathToFileURL(handlerPath).href}?t=${Date.now()}`)
          const handler = mod.default
          if (typeof handler !== 'function') {
            return sendError(500, 'API handler not found or invalid')
          }

          const response = await handler(request)
          if (!(response instanceof Response)) {
            return sendError(500, 'API handler did not return a Response')
          }

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          const data = await response.arrayBuffer()
          res.end(Buffer.from(data))
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
