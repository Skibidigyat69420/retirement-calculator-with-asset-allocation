import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

/**
 * Vite dev-server plugin for serving local market data during dev
 */
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: ViteDevServer) {
      const projectRoot = server.config.root
      server.middlewares.use('/api', (req: any, res: any, next: any) => {
        // Skip Angel One proxy (handled by server.proxy)
        if (req.url?.startsWith('/angelone')) {
          return next()
        }

        if (req.url?.startsWith('/market-data') || req.url?.startsWith('/market-status')) {
          const filePath = resolve(projectRoot, 'public', 'data', 'market-data.json')
          if (existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/json')
            res.end(readFileSync(filePath))
            return
          }
        }

        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
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
