import axios from 'axios'

const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_ROOT,
})

const extractErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail
  }
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.message) {
    return error.message
  }
  return 'Network Error: Unable to connect to the server. Please ensure the backend is running on port 8000.'
}

export const analyzeText = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/text/analyze', formData)

    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const analyzeRawText = async (text) => {
  try {
    const response = await apiClient.post('/text/analyze-raw', { text })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const exportAnalysisData = async (data) => {
  try {
    const response = await apiClient.post('/text/export', { data }, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const analyzeBluesky = async (data) => {
  try {
    const response = await apiClient.post('/bluesky/analyze', data)
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const analyzeYoutube = async (data) => {
  try {
    const response = await apiClient.post('/youtube/analyze', data)
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const analyzeFinancePulse = async (ticker) => {
  try {
    const response = await apiClient.get(`/finance-pulse/${ticker}`)
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}
