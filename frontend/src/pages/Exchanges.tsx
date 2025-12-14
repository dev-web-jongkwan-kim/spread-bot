import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { logger } from '../services/logger'
import { Exchange } from '../types'
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { SUPPORTED_EXCHANGES } from '../constants'

const SUPPORTED_EXCHANGES_TEMP = [
  { id: 'binance', name: 'Binance', emoji: '🟡' },
  { id: 'coinbase', name: 'Coinbase', emoji: '🔵' },
  { id: 'kraken', name: 'Kraken', emoji: '🟣' },
  { id: 'okx', name: 'OKX', emoji: '⚫' },
  { id: 'bybit', name: 'Bybit', emoji: '🟠' },
  { id: 'kucoin', name: 'KuCoin', emoji: '🟢' },
  { id: 'gateio', name: 'Gate.io', emoji: '🔴' },
  { id: 'huobi', name: 'Huobi', emoji: '🔷' },
]

export default function Exchanges() {
  const { user, refreshUser } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    logger.userAction('view_exchanges_page')
    loadExchanges()
  }, [])

  const loadExchanges = async () => {
    try {
      const response = await api.get('/exchanges')
      setExchanges(response.data)
    } catch (error) {
      console.error('Failed to load exchanges:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExchange = async (exchangeId: string) => {
    setActionLoading((prev) => ({ ...prev, [exchangeId]: true }))
    try {
      logger.userAction('toggle_exchange', { exchangeId })
      await api.post(`/exchanges/${exchangeId}/toggle`)
      await Promise.all([loadExchanges(), refreshUser()])
      const userExchange = exchanges.find((e) => e.id === exchangeId)
      const isActive = userExchange?.is_active || false
      toast.success(
        isActive
          ? t('exchanges.removed') || `${exchangeId} removed`
          : t('exchanges.added') || `${exchangeId} added`,
      )
      logger.userAction('toggle_exchange_success', { exchangeId, isActive: !isActive })
    } catch (error: any) {
      logger.error('Failed to toggle exchange', error instanceof Error ? error : new Error(String(error)), { exchangeId })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [exchangeId]: false }))
    }
  }

  const planLimits = {
    free: { max_exchanges: 3 },
    basic: { max_exchanges: 5 },
    pro: { max_exchanges: 10 },
    whale: { max_exchanges: -1 },
  }

  const limits = planLimits[user?.plan || 'free']
  const selectedCount = exchanges.filter((e) => e.is_active).length
  const canAddMore =
    limits.max_exchanges === -1 || selectedCount < limits.max_exchanges

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-2">
          {t('exchanges.title')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('exchanges.description')}
        </p>
      </div>

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="card p-4 bg-amber-900/30 border-amber-700/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {t('exchanges.limitReached')}
              </p>
              <p className="text-sm text-amber-300">
                {t('exchanges.limitReachedDesc')}
              </p>
            </div>
            <a
              href="/subscription"
              className="btn-primary text-sm whitespace-nowrap"
            >
              {t('exchanges.upgrade')}
            </a>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="card p-4 sm:p-6">
        <p className="text-sm sm:text-base text-neutral-300">
          {t('exchanges.selected')}: <span className="font-semibold text-teal-400">{selectedCount}</span>
          {limits.max_exchanges !== -1 && (
            <span className="text-neutral-400"> / {limits.max_exchanges}</span>
          )}
        </p>
      </div>

      {/* Exchanges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {SUPPORTED_EXCHANGES_TEMP.map((exchange) => {
          const userExchange = exchanges.find((e) => e.id === exchange.id)
          const isActive = userExchange?.is_active || false
          const isLocked = !canAddMore && !isActive

          return (
            <div
              key={exchange.id}
              className={`card p-4 sm:p-6 border-2 transition-all duration-200 ${
                isActive
                  ? 'border-teal-500 bg-gradient-to-br from-teal-900/30 to-teal-800/20 shadow-lg shadow-teal-500/10'
                  : 'border-neutral-700 hover:border-neutral-600'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-soft-lg hover:-translate-y-1'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl">{exchange.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-neutral-100 truncate">
                      {exchange.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-400 truncate">{exchange.id}</p>
                  </div>
                </div>
                {isActive ? (
                  <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-teal-400 shrink-0" />
                ) : (
                  <Circle className="h-6 w-6 sm:h-7 sm:w-7 text-neutral-500 shrink-0" />
                )}
              </div>
              <button
                onClick={() => !isLocked && toggleExchange(exchange.id)}
                disabled={isLocked || (actionLoading && actionLoading[exchange.id])}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-red-900/30 to-red-800/20 text-red-300 hover:from-red-900/40 hover:to-red-800/30 border border-red-700/50'
                    : 'bg-gradient-to-r from-teal-900/30 to-teal-800/20 text-teal-300 hover:from-teal-900/40 hover:to-teal-800/30 border border-teal-700/50'
                } ${isLocked || (actionLoading && actionLoading[exchange.id]) ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md active:scale-95'}`}
              >
                {actionLoading && actionLoading[exchange.id] ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.processing') || 'Processing...'}
                  </>
                ) : (
                  isActive ? t('exchanges.remove') : t('exchanges.add')
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
