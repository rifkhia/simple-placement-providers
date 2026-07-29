import api from './index.js'

export const getPlacements = (params = {}) =>
  api.get('/api/v2/placements', { params })

export const getPlacement = (id) =>
  api.get(`/api/v2/placements/${id}`)

export const createPlacement = (data) =>
  api.post('/api/v2/placements', data)

export const updatePlacement = (id, data) =>
  api.put(`/api/v2/placements/${id}`, data)

export const deletePlacement = (id) =>
  api.delete(`/api/v2/placements/${id}`)
