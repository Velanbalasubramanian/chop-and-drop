import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend dev server. /api requests are proxied to the Node/Express backend
// so the React app can call fetch('/api/...') without worrying about ports.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
