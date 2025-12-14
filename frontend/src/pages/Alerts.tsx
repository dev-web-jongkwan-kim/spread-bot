import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { logger } from '../services/logger'
import api from '../services/api'
import { Alert } from '../types'
import { format } from 'date-fns'
import { ExternalLink, Loader2 } from 'lucide-react'

export default function Alerts() {
  const { t } = useI18n()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    logger.userAction('view_alerts_page', { page })
    loadAlerts()
  }, [page])

  const loadAlerts = async () => {
    try {
      const response = await api.get(`/alerts?page=${page}&limit=20`)
      if (page === 1) {
        setAlerts(response.data.items || [])
      } else {
        setAlerts((prev) => [...prev, ...(response.data.items || [])])
      }
      setHasMore(response.data.has_more || false)
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-2">
          {t('alerts.title')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('alerts.description')}
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <p className="text-neutral-400 text-sm sm:text-base">{t('alerts.noAlerts')}</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="divide-y divide-neutral-700/50">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-4 sm:px-6 py-4 hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold text-neutral-100">
                          {alert.symbol}
                        </span>
                        <span className="px-2 py-1 bg-teal-900/50 text-teal-300 rounded-full text-xs sm:text-sm font-medium">
                          {alert.spread_percent.toFixed(2)}%
                        </span>
                        {alert.was_clicked && (
                          <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs">
                            {t('alerts.clicked')}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                        <div>
                          <p className="text-xs text-neutral-400 mb-1">{t('alerts.buy')}</p>
                          <p className="text-sm font-medium text-neutral-100">
                            {alert.buy_exchange}
                          </p>
                          <p className="text-sm text-neutral-300">
                            ${alert.buy_price.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400 mb-1">{t('alerts.sell')}</p>
                          <p className="text-sm font-medium text-neutral-100">
                            {alert.sell_exchange}
                          </p>
                          <p className="text-sm text-neutral-300">
                            ${alert.sell_price.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-xs text-neutral-400">{t('alerts.potentialProfit')}</p>
                          <p className="text-sm font-semibold text-teal-400">
                            ${alert.potential_profit.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400">{t('alerts.time')}</p>
                          <p className="text-sm text-neutral-300">
                            {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                      <a
                        href={`https://${alert.buy_exchange}.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-teal-900/30 text-teal-300 rounded-lg hover:bg-teal-900/40 flex items-center justify-center gap-1 transition-colors"
                      >
                        {t('alerts.buy')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={`https://${alert.sell_exchange}.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs bg-teal-900/30 text-teal-300 rounded-lg hover:bg-teal-900/40 flex items-center justify-center gap-1 transition-colors"
                      >
                        {t('alerts.sell')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary"
              >
                {t('alerts.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}




