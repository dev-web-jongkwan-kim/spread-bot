import axios from 'axios'
import { logger } from './logger'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-origin requests
})

// Request interceptor - 토큰 추가 및 로깅
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // API 호출 로깅
    logger.apiCall(config.method?.toUpperCase() || 'GET', config.url || '', config.data)
    
    return config
  },
  (error) => {
    logger.apiError('REQUEST', 'unknown', error)
    return Promise.reject(error)
  }
)

// Response interceptor - 에러 처리 및 로깅
api.interceptors.response.use(
  (response) => {
    // 성공 로깅
    logger.apiSuccess(response.config.method?.toUpperCase() || 'GET', response.config.url || '', {
      status: response.status,
    })
    return response
  },
  (error) => {
    // 에러 로깅
    logger.apiError(
      error.config?.method?.toUpperCase() || 'UNKNOWN',
      error.config?.url || 'unknown',
      error.response?.data || error.message,
      error.config?.data,
    )

    if (error.response?.status === 401) {
      // Clear both localStorage and cookie
      localStorage.removeItem('auth_token')
      // Cookie will be cleared by server on /api/auth/logout
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api




