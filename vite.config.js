import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Parse VITE_API_BASE_URL to split origin from path prefix
// e.g. https://api-gateway-test.internal.example.com/placement-api
//   → target: https://api-gateway-test.internal.example.com
//   → prefix: /placement-api
const rawUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000'
const parsed = new URL(rawUrl)
const apiOrigin = parsed.origin
const apiPrefix = parsed.pathname.replace(/\/$/, '') // strip trailing slash

const user = process.env.VITE_BACKEND_USER
const pass = process.env.VITE_BACKEND_PASSWORD

// Host the preview server may be served under, when behind a reverse proxy.
const allowedHost = process.env.VITE_ALLOWED_HOST

const proxyConfig = {
  '/api': {
    target: apiOrigin,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => apiPrefix + path,
    ...(user && pass ? {
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
      }
    } : {}),
  }
}

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: proxyConfig,
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: allowedHost ? [allowedHost] : undefined,
    proxy: proxyConfig,
  },
})
