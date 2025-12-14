import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'

export default function Login() {
  const widgetRef = useRef<HTMLDivElement>(null)
  const { login } = useAuth()
  const { t } = useI18n()

  useEffect(() => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username'
    
    console.log('Loading Telegram widget with bot:', botUsername)
    
    if (!widgetRef.current) {
      console.error('Widget container not found')
      return
    }

    // Bot username이 설정되지 않은 경우 안내 메시지
    if (botUsername === 'your_bot_username') {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = `
          <div class="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">⚠️ Bot username이 설정되지 않았습니다</p>
            <p class="text-xs text-gray-500">frontend/.env 파일에 VITE_TELEGRAM_BOT_USERNAME을 설정하세요</p>
          </div>
        `
      }
      return
    }

    // 기존 스크립트 제거
    widgetRef.current.innerHTML = ''

    // 전역 콜백 함수 등록 (스크립트보다 먼저)
    ;(window as any).onTelegramAuth = (user: any) => {
      console.log('Telegram auth received:', user)
      login(user)
    }

    // Telegram Login Widget 스크립트 생성
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'true')
    script.async = true
    
    console.log('Creating Telegram widget with attributes:', {
      bot: botUsername,
      hostname: window.location.hostname,
      origin: window.location.origin,
    })

    script.onload = () => {
      console.log('Telegram widget script loaded successfully, bot:', botUsername)
      console.log('Current hostname:', window.location.hostname)
      console.log('Current origin:', window.location.origin)
      console.log('Widget container:', widgetRef.current)
      
      // 위젯이 로드된 후 여러 번 확인
      let checkCount = 0
      const maxChecks = 10
      
      const checkWidget = () => {
        checkCount++
        if (!widgetRef.current) {
          console.error('Widget container lost!')
          return
        }
        
        const childrenCount = widgetRef.current.children.length
        const hasIframe = widgetRef.current.querySelector('iframe')
        const hasScript = widgetRef.current.querySelector('script[src*="telegram-widget"]')
        
        console.log(`Check ${checkCount}/${maxChecks}:`, {
          childrenCount,
          hasIframe: !!hasIframe,
          hasScript: !!hasScript,
          innerHTML: widgetRef.current.innerHTML.substring(0, 100),
        })
        
        if (hasIframe || childrenCount > 0) {
          console.log('✅ Widget rendered successfully!')
          return
        }
        
        if (checkCount < maxChecks) {
          setTimeout(checkWidget, 500)
        } else {
          // 최종 확인 후에도 위젯이 없으면 에러 메시지 표시
          console.warn('Widget script loaded but no widget rendered after', maxChecks, 'checks')
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          const isNgrok = window.location.hostname.includes('ngrok')
          
          if (widgetRef.current) {
            widgetRef.current.innerHTML = `
              <div class="text-center p-4 border-2 border-dashed border-yellow-300 rounded-lg bg-yellow-50">
                <p class="text-sm text-yellow-800 mb-2 font-semibold">⚠️ Bot domain invalid</p>
                <p class="text-xs text-yellow-700 mb-2">
                  ${isLocalhost 
                    ? '로컬 개발 환경에서는 Telegram 위젯이 작동하지 않습니다.<br/>HTTPS 도메인이 필요합니다.'
                    : isNgrok
                    ? `ngrok 도메인에서 위젯이 표시되지 않습니다.<br/><br/>BotFather에서 도메인을 설정하세요:<br/><code class="bg-white px-2 py-1 rounded text-xs">/setdomain ${window.location.hostname}</code><br/><br/>또는 개발용 임시 로그인 버튼을 사용하세요.`
                    : 'BotFather에서 도메인을 설정하세요: /setdomain'
                  }
                </p>
                <p class="text-xs text-gray-600 mt-2">Bot: ${botUsername}</p>
                <p class="text-xs text-gray-500 mt-1">Hostname: ${window.location.hostname}</p>
              </div>
            `
          }
        }
      }
      
      // 첫 확인은 1초 후 시작
      setTimeout(checkWidget, 1000)
    }

    script.onerror = () => {
      console.error('Failed to load Telegram widget script')
      if (widgetRef.current) {
        widgetRef.current.innerHTML = `
          <div class="text-center p-4 border-2 border-dashed border-red-300 rounded-lg">
            <p class="text-sm text-red-600 mb-2">❌ Telegram 위젯 스크립트를 로드할 수 없습니다</p>
            <p class="text-xs text-gray-500">인터넷 연결을 확인하세요</p>
          </div>
        `
      }
    }

    widgetRef.current.appendChild(script)

    return () => {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = ''
      }
      delete (window as any).onTelegramAuth
    }
  }, [login])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600">
      <div className="max-w-md w-full glass rounded-3xl shadow-soft-lg p-6 sm:p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-3">
            CryptoSpreadBot
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            {t('login.description')}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm sm:text-base text-neutral-700 mb-4 text-center font-medium">
            {t('login.loginWithTelegram')}
          </p>
          <div 
            ref={widgetRef}
            id="telegram-login" 
            className="flex justify-center min-h-[50px]"
          ></div>
          
          {/* 개발 모드 또는 ngrok: 임시 로그인 버튼 */}
          {(import.meta.env.DEV || window.location.hostname.includes('ngrok')) && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs sm:text-sm text-amber-800 mb-3 text-center font-medium">
                ⚠️ {t('login.devLogin') || 'Development Login'}
              </p>
              <p className="text-xs text-amber-700 mb-3 text-center">
                {t('login.devLoginDesc') || 'Test with different users (auto signup on first login)'}
              </p>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    await login({
                      id: 123456789,
                      username: 'dev_user_1',
                      first_name: 'Dev',
                      last_name: 'User 1',
                    })
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  {t('login.devLogin') || 'Dev Login'} - User 1
                </button>
                <button
                  onClick={async () => {
                    await login({
                      id: 987654321,
                      username: 'dev_user_2',
                      first_name: 'Test',
                      last_name: 'User 2',
                    })
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  {t('login.devLogin') || 'Dev Login'} - User 2
                </button>
                <button
                  onClick={async () => {
                    const randomId = Math.floor(Math.random() * 1000000000)
                    await login({
                      id: randomId,
                      username: `user_${randomId}`,
                      first_name: 'Random',
                      last_name: `User ${randomId}`,
                    })
                  }}
                  className="w-full btn-secondary text-sm"
                >
                  {t('login.randomUser') || 'Random User (New Signup)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


