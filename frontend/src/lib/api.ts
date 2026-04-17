import axios from 'axios'
import type { Filters } from '../components/ui/FiltersBar'

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

export const apiClient = axios.create({ baseURL: BASE })

// Auto-login: fetch and cache a JWT token transparently
let _token: string | null = null
let _tokenPromise: Promise<string> | null = null

async function getToken(): Promise<string> {
  if (_token) return _token
  if (_tokenPromise) return _tokenPromise
  _tokenPromise = apiClient
    .post('/api/auth/login', { email: 'admin@winprofx.com', password: 'change-me' })
    .then((r) => {
      _token = r.data.access_token as string
      _tokenPromise = null
      return _token
    })
    .catch(() => {
      _tokenPromise = null
      return ''
    })
  return _tokenPromise
}

// Attach token to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If a 401 comes back, clear the cached token and retry once
apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      _token = null
      err.config._retry = true
      const token = await getToken()
      if (token) err.config.headers.Authorization = `Bearer ${token}`
      return apiClient(err.config)
    }
    return Promise.reject(err)
  },
)

function params(filters: Filters) {
  const p: Record<string, string> = {}
  if (filters.start) p.start = filters.start
  if (filters.end) p.end = filters.end
  if (filters.user) p.user = filters.user
  if (filters.instrument) p.instrument = filters.instrument
  return p
}

export async function fetchOverview(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/overview', { params: params(filters) })
  return data
}

export async function fetchUsers(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/users', { params: params(filters) })
  return data
}

export async function fetchTrades(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/trades', { params: params(filters) })
  return data
}

export async function fetchFinance(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/finance', { params: params(filters) })
  return data
}

export async function fetchInstruments(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/instruments', { params: params(filters) })
  return data
}

export async function fetchRisk(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/risk', { params: params(filters) })
  return data
}

export async function fetchTime(filters: Filters = {}) {
  const { data } = await apiClient.get('/api/time', { params: params(filters) })
  return data
}
