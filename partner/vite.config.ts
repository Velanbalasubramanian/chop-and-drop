import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone Partner Portal dev server running on port 5175.
// Proxies /api and /socket.io requests to the Node/Express backend on port 4000.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend server is currently offline on port 4000. Run "npm run dev:backend".' }))
            }
          })
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Suppress noisy ECONNREFUSED ws errors when backend is restarting or offline
          })
        },
      },
    },
  },
})
