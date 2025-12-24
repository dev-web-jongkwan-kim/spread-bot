import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { logger } from '../services/logger'
import { Bell, BellOff, Globe, TrendingUp, Loader2 } from 'lucide-react'

const PRESET_THRESHOLDS = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0]
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { t, setLanguage } = useI18n()
  const toast = useToast()
  const [threshold, setThreshold] = useState(user?.threshold || 1.0)
  const [customThreshold, setCustomThreshold] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [muteDuration, setMuteDuration] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    logger.userAction('view_settings_page')
    if (user) {
      setThreshold(user.threshold)
    }
  }, [user])

  const updateThreshold = async (value: number) => {
    setActionLoading((prev) => ({ ...prev, threshold: true }))
    try {
      logger.userAction('update_threshold', { threshold: value })
      await api.put('/settings/threshold', { threshold: value })
      setThreshold(value)
      setShowCustomInput(false)
      setCustomThreshold('')
      await refreshUser()
      toast.success(t('settings.thresholdUpdated') || 'Threshold updated successfully')
      logger.userAction('update_threshold_success', { threshold: value })
    } catch (error: any) {
      logger.error('Failed to update threshold', error instanceof Error ? error : new Error(String(error)), { threshold: value })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, threshold: false }))
    }
  }

  const updateLanguage = async (langCode: string) => {
    setActionLoading((prev) => ({ ...prev, language: true }))
    try {
      logger.userAction('update_language', { language: langCode })
      await api.put('/settings/language', { language: langCode })
      setLanguage(langCode as any)
      await refreshUser()
      toast.success(t('settings.languageUpdated') || 'Language updated successfully')
      logger.userAction('update_language_success', { language: langCode })
    } catch (error: any) {
      logger.error('Failed to update language', error instanceof Error ? error : new Error(String(error)), { language: langCode })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, language: false }))
    }
  }

  const setMute = async (minutes: number | null) => {
    setActionLoading((prev) => ({ ...prev, mute: true }))
    try {
      logger.userAction('set_mute', { minutes })
      await api.post('/settings/mute', { minutes })
      await refreshUser()
      setMuteDuration(minutes)
      toast.success(t('settings.muted') || 'Notifications muted')
      logger.userAction('set_mute_success', { minutes })
    } catch (error: any) {
      logger.error('Failed to set mute', error instanceof Error ? error : new Error(String(error)), { minutes })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, mute: false }))
    }
  }

  const unmute = async () => {
    setActionLoading((prev) => ({ ...prev, unmute: true }))
    try {
      logger.userAction('unmute')
      await api.post('/settings/unmute')
      await refreshUser()
      setMuteDuration(null)
      toast.success(t('settings.unmuted') || 'Notifications unmuted')
      logger.userAction('unmute_success')
    } catch (error: any) {
      logger.error('Failed to unmute', error instanceof Error ? error : new Error(String(error)))
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, unmute: false }))
    }
  }

  const canUseCustomThreshold = (user as any)?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-2">
          {t('settings.title')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('settings.description')}
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Threshold */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-100">
              {t('settings.alertThreshold')}
            </h2>
          </div>
          <p className="text-sm text-neutral-300 mb-2">
            {t('settings.currentSetting')}: <span className="font-semibold text-teal-400">{threshold.toFixed(2)}%</span>
            <span className="ml-2 text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">
              ({t('settings.testMode')})
            </span>
          </p>
          <p className="text-xs sm:text-sm text-neutral-400 mb-4">
            {t('settings.alertThreshold')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            {PRESET_THRESHOLDS.map((value) => (
              <button
                key={value}
                onClick={() => updateThreshold(value)}
                disabled={actionLoading.threshold}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  threshold === value
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600 border border-neutral-600'
                }`}
              >
                {actionLoading.threshold && threshold === value ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  `${value}%`
                )}
              </button>
            ))}
          </div>
          {canUseCustomThreshold && (
            <div>
              {showCustomInput ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(e.target.value)}
                    placeholder="0.01 - 10.00"
                    min="0.01"
                    max="10.0"
                    step="0.01"
                    className="input flex-1"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const value = parseFloat(customThreshold)
                        if (!isNaN(value) && value >= 0.01 && value <= 10.0) {
                          const roundedValue = Math.round(value * 100) / 100
                          updateThreshold(roundedValue)
                        } else {
                          toast.error(t('settings.customValueDesc'))
                        }
                      }}
                      disabled={actionLoading.threshold}
                      className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {actionLoading.threshold ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('common.saving')}
                        </>
                      ) : (
                        t('common.save')
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(false)
                        setCustomThreshold('')
                      }}
                      className="btn-secondary whitespace-nowrap"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full btn-secondary text-sm"
                >
                  {t('settings.customValueDesc')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Language */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-900/30 rounded-lg">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-100">
              {t('settings.language')}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => updateLanguage(lang.code)}
                disabled={actionLoading.language}
                className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  user?.language === lang.code
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600 border border-neutral-600'
                }`}
              >
                {actionLoading.language && user?.language === lang.code ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('common.processing')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mute */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${user?.is_muted ? 'bg-red-900/30' : 'bg-teal-900/30'}`}>
              {user?.is_muted ? (
                <BellOff className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              ) : (
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400" />
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-100">
              {t('settings.notifications')}
            </h2>
          </div>
          {user?.is_muted ? (
            <div>
              <p className="text-sm text-neutral-300 mb-4">
                {t('settings.currentlyMuted')}
                {user.muted_until &&
                  ` ${t('settings.mutedUntil')} ${new Date(user.muted_until).toLocaleString()}`}
              </p>
              <button
                onClick={unmute}
                disabled={actionLoading.unmute}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading.unmute ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  t('settings.unmute')
                )}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-neutral-300 mb-4">
                {t('settings.notifications')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {[15, 30, 60, 240, 480].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setMute(minutes)}
                    disabled={actionLoading.mute}
                    className="px-4 py-2.5 bg-neutral-700 text-neutral-200 rounded-xl hover:bg-neutral-600 text-sm font-medium border border-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t(`settings.muteOptions.${minutes}`) || `${minutes}${t('settings.minutes')}`}
                  </button>
                ))}
                <button
                  onClick={() => setMute(null)}
                  disabled={actionLoading.mute}
                  className="px-4 py-2.5 bg-neutral-700 text-neutral-200 rounded-xl hover:bg-neutral-600 text-sm font-medium border border-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.muteOptions.forever')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

