import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { logger } from '../services/logger'
import api from '../services/api'
import { Alert, CoinPriceData } from '../types'
import {
  TrendingUp,
  Coins as CoinsIcon,
  Building2,
  Bell,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { SUPPORTED_EXCHANGES_MAP } from '../constants'

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [priceData, setPriceData] = useState<CoinPriceData[]>([])
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false) // 초기값을 false로 변경하여 첫 로드 시에도 깜빡임 방지
  const [initialLoad, setInitialLoad] = useState(true) // 첫 로드 여부 추적
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    logger.userAction('view_dashboard')
    loadData()
    loadPrices(true) // 첫 로드

    // 10초마다 가격 업데이트
    intervalRef.current = window.setInterval(() => {
      loadPrices(false) // 이후 업데이트는 로딩 상태 변경하지 않음
    }, 10000)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [user])

  const loadData = async () => {
    try {
      const alertsRes = await api.get('/alerts?limit=5')
      setRecentAlerts(alertsRes.data.items || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPrices = async (isInitialLoad = false) => {
    // 첫 로드가 아니면 로딩 상태를 변경하지 않음 (깜빡임 방지)
    if (isInitialLoad) {
      setPriceLoading(true)
      setInitialLoad(true)
    }
    
    try {
      const response = await api.get('/prices')
      // Ensure each coin has prices as an array
      const coins = (response.data.coins || []).map((coin: CoinPriceData) => ({
        ...coin,
        prices: Array.isArray(coin.prices) ? coin.prices : [],
      }))
      setPriceData(coins)
    } catch (error) {
      logger.error('Failed to load prices', error instanceof Error ? error : new Error(String(error)))
      console.error('Failed to load prices:', error)
    } finally {
      if (isInitialLoad) {
        setPriceLoading(false)
        setInitialLoad(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
      </div>
    )
  }

  const planLimits = {
    free: { coins: 1, exchanges: 3, alerts: 5 },
    basic: { coins: 5, exchanges: 5, alerts: -1 },
    pro: { coins: -1, exchanges: 10, alerts: -1 },
    whale: { coins: -1, exchanges: -1, alerts: -1 },
  }

  const limits = planLimits[user?.plan || 'free']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-50 mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('dashboard.welcome', { name: user?.first_name || user?.username || 'User' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title={t('dashboard.monitoringCoins')}
          value={`${user?.coins.length || 0}${limits.coins === -1 ? '' : `/${limits.coins}`}`}
          icon={CoinsIcon}
          color="primary"
        />
        <StatCard
          title={t('dashboard.selectedExchanges')}
          value={`${user?.exchanges.length || 0}${limits.exchanges === -1 ? '' : `/${limits.exchanges}`}`}
          icon={Building2}
          color="accent"
        />
        <StatCard
          title={t('dashboard.todayAlerts')}
          value={`${user?.daily_alerts_sent || 0}${limits.alerts === -1 ? '' : `/${limits.alerts}`}`}
          icon={Bell}
          color="purple"
        />
        <StatCard
          title={t('dashboard.currentThreshold')}
          value={`${user?.threshold || 0}%`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Plan Status */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              {t('dashboard.currentPlan')}: <span className="text-teal-400">{user?.plan.toUpperCase()}</span>
            </h2>
            <p className="mt-1 text-sm text-neutral-300">
              {user?.plan === 'free' && t('dashboard.upgradePrompt')}
              {user?.plan !== 'free' && t('dashboard.subscriptionActive')}
            </p>
          </div>
          {user?.plan === 'free' && (
            <Link
              to="/app/subscription"
              className="btn-primary whitespace-nowrap"
            >
              {t('dashboard.upgrade')}
            </Link>
          )}
        </div>
      </div>

      {/* Real-time Price Comparison */}
      {(!initialLoad || !priceLoading) && priceData.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
            {t('dashboard.realTimePrices')}
          </h2>
          {priceData.map((coin) => {
            try {
            // Ensure prices is always an array
            const pricesArray = Array.isArray(coin.prices) ? coin.prices : []
            
            // Check if this is an invalid symbol (doesn't exist on any exchange)
            const isInvalidSymbol = coin.invalid_symbol === true
            
            return (
            <div key={coin.symbol} className={`card overflow-hidden ${isInvalidSymbol ? 'border-2 border-red-500/50 bg-red-900/20' : ''}`}>
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-700/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                      {coin.symbol}
                    </h2>
                    {isInvalidSymbol && (
                      <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-red-900/50 text-red-300 border border-red-700/50">
                        {t('dashboard.invalidSymbol') || '존재하지 않는 종목'}
                      </span>
                    )}
                    {coin.spread_percent != null && coin.spread_percent > 0 && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          coin.spread_percent >= (user?.threshold || 1.0)
                            ? 'bg-gradient-to-r from-teal-900/50 to-teal-800/50 text-teal-300 border border-teal-700/50'
                            : 'bg-neutral-700/50 text-neutral-300 border border-neutral-600'
                        }`}
                      >
                        {t('dashboard.spread')}: {Number(coin.spread_percent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-neutral-400">
                      {t('dashboard.average')}: ${coin.avg_price != null ? Number(coin.avg_price).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      }) : 'N/A'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {coin.timestamp &&
                        format(new Date(coin.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4">
                {isInvalidSymbol ? (
                  <div className="py-8 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-red-300 mb-1">
                      {t('dashboard.symbolNotFound') || '존재하지 않는 종목입니다'}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {t('dashboard.symbolNotFoundDesc') || '이 종목은 어떤 거래소에서도 거래되지 않습니다. 종목 목록에서 제거해주세요.'}
                    </p>
                  </div>
                ) : pricesArray.length === 0 ? (
                  <div className="py-8 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-neutral-300">
                      {t('dashboard.noPriceData') || '가격 데이터를 가져올 수 없습니다'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {t('dashboard.noPriceDataDesc') || '이 종목은 선택한 거래소에서 거래되지 않거나 일시적인 오류가 발생했습니다.'}
                    </p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {pricesArray.map((exchangePrice) => {
                    const exchangeInfo =
                      SUPPORTED_EXCHANGES_MAP[exchangePrice.exchange as keyof typeof SUPPORTED_EXCHANGES_MAP]
                    const isMin = coin.min_exchange === exchangePrice.exchange
                    const isMax = coin.max_exchange === exchangePrice.exchange
                    const deviationColor =
                      exchangePrice.deviation_percent != null && exchangePrice.deviation_percent > 0
                        ? 'text-teal-400'
                        : exchangePrice.deviation_percent != null && exchangePrice.deviation_percent < 0
                        ? 'text-red-400'
                        : 'text-neutral-400'

                    const isNotSupported = exchangePrice.not_supported || (exchangePrice.price === null && exchangePrice.deviation_percent === null)

                    return (
                      <div
                        key={exchangePrice.exchange}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          isNotSupported
                            ? 'border-neutral-700 bg-neutral-800/30 opacity-60'
                            : isMin
                            ? 'border-teal-600/50 bg-gradient-to-br from-teal-900/30 to-teal-800/30 shadow-sm'
                            : isMax
                            ? 'border-red-600/50 bg-gradient-to-br from-red-900/30 to-red-800/30 shadow-sm'
                            : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg sm:text-xl">
                              {exchangeInfo?.emoji || '📊'}
                            </span>
                            <span className="font-semibold text-neutral-100 text-sm sm:text-base">
                              {exchangeInfo?.name || exchangePrice.exchange}
                            </span>
                            {isNotSupported && (
                              <span className="text-xs bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                                {t('dashboard.notSupported') || 'Not Supported'}
                              </span>
                            )}
                            {!isNotSupported && isMin && (
                              <span className="text-xs bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded-full font-medium">
                                {t('dashboard.min')}
                              </span>
                            )}
                            {!isNotSupported && isMax && (
                              <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full font-medium">
                                {t('dashboard.max')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          {isNotSupported ? (
                            <span className="text-sm sm:text-base text-neutral-500 italic">
                              {t('dashboard.notTraded') || 'Not traded on this exchange'}
                            </span>
                          ) : (
                            <>
                              <span className="text-xl sm:text-2xl font-bold text-neutral-100 truncate">
                                $
                                {exchangePrice.price != null ? Number(exchangePrice.price).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 6,
                                }) : 'N/A'}
                              </span>
                              <div
                                className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${deviationColor} shrink-0`}
                              >
                                {exchangePrice.deviation_percent != null && exchangePrice.deviation_percent > 0 ? (
                                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : exchangePrice.deviation_percent != null && exchangePrice.deviation_percent < 0 ? (
                                  <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : null}
                                {exchangePrice.deviation_percent != null && exchangePrice.deviation_percent !== 0 && (
                                  <span>
                                    {exchangePrice.deviation_percent > 0 ? '+' : ''}
                                    {Number(exchangePrice.deviation_percent).toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
            </div>
            )
            } catch (error) {
              logger.error('Error rendering coin', error instanceof Error ? error : new Error(String(error)), { symbol: coin.symbol })
              return (
                <div key={coin.symbol} className="card overflow-hidden border-2 border-red-200">
                  <div className="px-4 sm:px-6 py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-neutral-100 mb-1">
                          {coin.symbol}
                        </h3>
                        <p className="text-sm text-neutral-300">
                          {t('dashboard.coinError') || '이 종목의 데이터를 표시하는 중 오류가 발생했습니다.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
      )}

      {priceData.length === 0 && user && (user.coins?.length || 0) > 0 && (
        <div className="card p-8 sm:p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-neutral-400" />
          <h3 className="mt-4 text-base sm:text-lg font-semibold text-neutral-100">
            {t('dashboard.noPriceData')}
          </h3>
          <p className="mt-2 text-sm sm:text-base text-neutral-500">
            {t('dashboard.noPriceDataDesc')}
          </p>
        </div>
      )}

      {/* 초기 설정 안내 */}
      {user && (user.coins?.length || 0) === 0 && (
        <div className="card p-8 sm:p-12 text-center">
          <CoinsIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-neutral-400 mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-neutral-100 mb-2">
            {t('dashboard.setupRequired') || 'Setup Required'}
          </h3>
          <p className="text-sm sm:text-base text-neutral-500 mb-6">
            {t('dashboard.setupRequiredDesc') || 'Please add coins and select exchanges to start monitoring.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/app/coins" className="btn-primary inline-flex items-center justify-center gap-2">
              <CoinsIcon className="h-5 w-5" />
              {t('nav.coins')}
            </Link>
            <Link to="/app/exchanges" className="btn-secondary inline-flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('nav.exchanges')}
            </Link>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-neutral-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-100">
            {t('dashboard.recentAlerts')}
          </h2>
        </div>
        <div className="divide-y divide-neutral-200/50">
          {recentAlerts.length === 0 ? (
            <div className="px-4 sm:px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-neutral-400" />
              <h3 className="mt-4 text-base sm:text-lg font-semibold text-neutral-100">
                {t('dashboard.noAlerts')}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-neutral-500">
                {t('dashboard.noAlertsDesc')}
              </p>
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div key={alert.id} className="px-4 sm:px-6 py-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-semibold text-neutral-100">
                        {alert.symbol}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-teal-400 px-2 py-0.5 bg-teal-900/30 rounded-full">
                        {alert.spread_percent != null ? Number(alert.spread_percent).toFixed(2) : 'N/A'}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-300">
                      {alert.buy_exchange} → {alert.sell_exchange}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-base sm:text-lg font-semibold text-neutral-100">
                      ${alert.potential_profit != null ? Number(alert.potential_profit).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      }) : 'N/A'}
                    </p>
                    <p className="text-xs text-neutral-500">{t('dashboard.potential')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {recentAlerts.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-neutral-200/50">
            <Link
              to="/app/alerts"
              className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1"
            >
              {t('dashboard.viewAll')} →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: any
  color: string
}) {
  const colorClasses = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600',
    accent: 'bg-gradient-to-br from-accent-500 to-accent-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  }

  return (
    <div className="card-hover p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`${colorClasses[color as keyof typeof colorClasses]} p-3 sm:p-4 rounded-xl shadow-lg`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-neutral-400 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-100 mt-1">{value}</p>
        </div>
      </div>
    </div>
  )
}

