interface LogLevel {
  DEBUG: 'debug'
  INFO: 'info'
  WARN: 'warn'
  ERROR: 'error'
}

interface LogData {
  level: string
  message: string
  data?: any
  userId?: string
  timestamp: string
  url?: string
  userAgent?: string
  error?: {
    message: string
    stack?: string
    name?: string
  }
}

class Logger {
  private apiUrl: string
  private userId: string | null = null

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3033'
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private async sendLog(logData: LogData) {
    try {
      // 로그 전송 실패는 조용히 무시 (무한 루프 방지 및 CORS 문제 회피)
      // 개발 환경에서만 콘솔에 출력
      if (import.meta.env.DEV) {
        // 로그는 콘솔에만 출력하고 서버 전송은 생략 (CORS 문제 회피)
        return;
      }

      // 프로덕션 환경에서만 서버로 전송 시도
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      await fetch(`${this.apiUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(logData),
        mode: 'cors',
      }).catch(() => {
        // 로그 전송 실패는 무시 (무한 루프 방지)
      })
    } catch (error) {
      // 로그 전송 실패는 무시
    }
  }

  private log(level: string, message: string, data?: any, error?: Error) {
    const logData: LogData = {
      level,
      message,
      data,
      userId: this.userId || undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    }

    // 콘솔에도 출력 (개발 환경)
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[consoleMethod](`[${level.toUpperCase()}]`, message, data || '', error || '')
    }

    // 백엔드로 전송
    this.sendLog(logData)
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error, data?: any) {
    this.log('error', message, data, error)
  }

  // API 호출 로깅
  apiCall(method: string, endpoint: string, data?: any) {
    this.info(`API ${method} ${endpoint}`, { method, endpoint, data })
  }

  apiSuccess(method: string, endpoint: string, response?: any) {
    this.info(`API ${method} ${endpoint} success`, { method, endpoint, response })
  }

  apiError(method: string, endpoint: string, error: any, data?: any) {
    this.error(`API ${method} ${endpoint} failed`, error instanceof Error ? error : new Error(String(error)), {
      method,
      endpoint,
      data,
    })
  }

  // 사용자 액션 로깅
  userAction(action: string, data?: any) {
    this.info(`User action: ${action}`, { action, ...data })
  }
}

export const logger = new Logger()

