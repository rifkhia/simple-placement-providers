import api from './index.js'

export const getProviders = (page = 1, pageSize = 100) =>
  api.get('/api/v2/providers', { params: { page, page_size: pageSize } })

export const getProvider = (id) =>
  api.get(`/api/v2/providers/${id}`)

export const createProvider = (data) =>
  api.post('/api/v2/providers', data)

export const updateProvider = (id, data) =>
  api.put(`/api/v2/providers/${id}`, data)

export const deleteProvider = (id) =>
  api.delete(`/api/v2/providers/${id}`)
