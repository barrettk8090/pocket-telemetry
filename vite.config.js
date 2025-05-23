import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/telemetry': {
        target: 'https://telemetry-api.dimo.zone',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/telemetry/, '')
      },
      '/api/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
