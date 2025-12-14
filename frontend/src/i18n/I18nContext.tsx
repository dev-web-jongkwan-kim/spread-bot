import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from './translations'
import { useAuth } from '../contexts/AuthContext'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function I18nProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    // Load language from user preference first, then localStorage, then browser
    if (user?.language && ['en', 'ko', 'ja', 'zh'].includes(user.language)) {
      setLanguageState(user.language as Language)
      localStorage.setItem('language', user.language)
    } else {
      const savedLang = localStorage.getItem('language') as Language
      if (savedLang && ['en', 'ko', 'ja', 'zh'].includes(savedLang)) {
        setLanguageState(savedLang)
      } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0]
        if (['en', 'ko', 'ja', 'zh'].includes(browserLang)) {
          setLanguageState(browserLang as Language)
        }
      }
    }
  }, [user?.language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = translations[language]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to English if key not found
        let fallbackValue: any = translations.en
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
            fallbackValue = fallbackValue[fk]
          } else {
            return key // Return key if not found even in English
          }
        }
        value = fallbackValue
        break
      }
    }

    if (typeof value !== 'string') {
      return key
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nProviderInner>{children}</I18nProviderInner>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
