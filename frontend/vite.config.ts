import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    // Bind every interface, not just IPv6 loopback. Vite's default host
    // resolves to [::1] only on Windows, so a browser that resolves
    // "localhost" to 127.0.0.1 (IPv4) gets connection-refused. This also
    // makes the dev server reachable from a phone on the same network.
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
