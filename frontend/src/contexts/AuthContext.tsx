import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { logger } from '../services/logger'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (telegramData: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // 세션 확인
    checkSession()

    // Telegram 인증 이벤트 리스너
    const handleTelegramAuth = async (event: CustomEvent) => {
      await login(event.detail)
    }

    window.addEventListener('telegram-auth' as any, handleTelegramAuth as EventListener)

    return () => {
      window.removeEventListener('telegram-auth' as any, handleTelegramAuth as EventListener)
    }
  }, [])

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await api.get('/auth/me')
        setUser(response.data)
        if (response.data?.id) {
          logger.setUserId(response.data.id)
        }
        logger.userAction('session_check_success')
      }
    } catch (error) {
      localStorage.removeItem('auth_token')
      logger.error('Session check failed', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const login = async (telegramData: any) => {
    try {
      logger.userAction('login_attempt', { telegramId: telegramData.id })
      const response = await api.post('/auth/telegram', telegramData)
      const { token, user } = response.data
      localStorage.setItem('auth_token', token)
      setUser(user)
      if (user?.id) {
        logger.setUserId(user.id)
      }
      logger.userAction('login_success', { userId: user?.id, telegramId: telegramData.id })
      navigate('/dashboard')
    } catch (error) {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), { telegramId: telegramData.id })
      console.error('Login failed:', error)
    }
  }

  const logout = async () => {
    try {
      logger.userAction('logout')
      // Call server to clear HTTP-only cookie
      await api.post('/auth/logout').catch(() => {
        // Ignore errors, clear local state anyway
      })
      localStorage.removeItem('auth_token')
      logger.setUserId('')
      setUser(null)
      navigate('/')
    } catch (error) {
      // Always clear local state even if server request fails
      localStorage.removeItem('auth_token')
      logger.setUserId('')
      setUser(null)
      navigate('/')
    }
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
      if (response.data?.id) {
        logger.setUserId(response.data.id)
      }
    } catch (error) {
      logger.error('Failed to refresh user', error instanceof Error ? error : new Error(String(error)))
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}




