import axios from 'axios'

const api = axios.create({
  // Always use relative paths — the Vite proxy handles routing to the backend
  // and injects Basic Auth credentials server-side (no credentials in the bundle)
  // VITE_BASE_PATH is baked at build time (e.g. /test or /prod)
  // so API calls go to /test/api/... which nginx proxies to the right container
  baseURL: import.meta.env.VITE_BASE_PATH || '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.message || err.message || 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

export default api
