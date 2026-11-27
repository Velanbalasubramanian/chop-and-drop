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
      '/api': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
