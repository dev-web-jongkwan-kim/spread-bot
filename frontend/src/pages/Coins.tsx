import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../contexts/ModalContext'
import api from '../services/api'
import { logger } from '../services/logger'
import { Coin, UnifiedSymbol } from '../types'
import { Plus, X, AlertCircle, Loader2, Settings2, Search, Filter, TrendingUp, Gamepad2, Coins as CoinsIcon, Zap } from 'lucide-react'

// Top 20 popular coins (Tier 1)
const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'MATIC', 'LTC', 'UNI', 'ATOM', 'APT', 'SUI', 'ARB', 'OP', 'NEAR', 'FTM', 'TRX']

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  'layer-1': { icon: Zap, color: 'text-blue-400', label: 'Layer 1' },
  'layer-2': { icon: Zap, color: 'text-purple-400', label: 'Layer 2' },
  'defi': { icon: TrendingUp, color: 'text-green-400', label: 'DeFi' },
  'meme': { icon: CoinsIcon, color: 'text-yellow-400', label: 'Meme' },
  'gaming': { icon: Gamepad2, color: 'text-pink-400', label: 'Gaming' },
  'ai': { icon: Zap, color: 'text-cyan-400', label: 'AI' },
}

export default function Coins() {
  const { user, refreshUser } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const { showConfirm } = useModal()
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null)
  const [thresholdValue, setThresholdValue] = useState('')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([])
  const [unifiedSymbols, setUnifiedSymbols] = useState<UnifiedSymbol[]>([])
  const [symbolAvailability, setSymbolAvailability] = useState<Record<string, Record<string, boolean>>>({})
  const [symbolsLoading, setSymbolsLoading] = useState(false)
  const [symbolSearch, setSymbolSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    logger.userAction('view_coins_page')
    loadCoins()
  }, [user])

  useEffect(() => {
    if (showAddModal) {
      setSymbolSearch('')
      loadAvailableSymbols()
    }
  }, [showAddModal])

  const loadCoins = async () => {
    try {
      const response = await api.get('/coins')
      setCoins(response.data)
    } catch (error) {
      console.error('Failed to load coins:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCoin = async (symbol: string) => {
    const loadingKey = `add-${symbol}`
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }))
    try {
      logger.userAction('add_coin', { symbol })
      await api.post('/coins', { symbol })
      await Promise.all([loadCoins(), refreshUser()])
      setShowAddModal(false)
      setSymbolSearch('')
      toast.success(t('coins.addSuccess') || `${symbol} added successfully`)
      logger.userAction('add_coin_success', { symbol })
    } catch (error: any) {
      logger.error('Failed to add coin', error instanceof Error ? error : new Error(String(error)), { symbol })
      toast.error(error.response?.data?.detail || t('coins.addError') || 'Failed to add coin')
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const removeCoin = async (symbol: string) => {
    const confirmed = await showConfirm(
      t('coins.removeConfirm') || `Remove ${symbol} from your watchlist?`,
      t('coins.remove') || 'Remove Coin'
    )
    if (!confirmed) return

    const loadingKey = `remove-${symbol}`
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }))
    try {
      logger.userAction('remove_coin', { symbol })
      await api.delete(`/coins/${symbol}`)
      await Promise.all([loadCoins(), refreshUser()])
      toast.success(t('coins.removeSuccess') || `${symbol} removed successfully`)
      logger.userAction('remove_coin_success', { symbol })
    } catch (error: any) {
      logger.error('Failed to remove coin', error instanceof Error ? error : new Error(String(error)), { symbol })
      toast.error(error.response?.data?.detail || t('coins.removeError') || 'Failed to remove coin')
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const updateCoinThreshold = async (symbol: string, threshold: number | null) => {
    const loadingKey = `threshold-${symbol}`
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }))
    try {
      logger.userAction('update_coin_threshold', { symbol, threshold })
      await api.put(`/coins/${symbol}/threshold`, { threshold })
      await loadCoins()
      setEditingThreshold(null)
      setThresholdValue('')
      toast.success(t('coins.thresholdUpdated') || 'Threshold updated successfully')
      logger.userAction('update_coin_threshold_success', { symbol, threshold })
    } catch (error: any) {
      logger.error('Failed to update coin threshold', error instanceof Error ? error : new Error(String(error)), { symbol, threshold })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const startEditingThreshold = (coin: Coin) => {
    setEditingThreshold(coin.symbol)
    setThresholdValue(coin.threshold?.toString() || '')
  }

  const loadAvailableSymbols = async () => {
    setSymbolsLoading(true)
    try {
      logger.userAction('load_available_symbols')
      
      // Try unified symbols API first (200 supported symbols)
      try {
        const [unifiedResponse, categoriesResponse] = await Promise.all([
          api.get('/unified-symbols', { params: { limit: 200 } }),
          api.get('/unified-symbols/categories'),
        ])
        
        if (unifiedResponse.data.symbols && unifiedResponse.data.symbols.length > 0) {
          setUnifiedSymbols(unifiedResponse.data.symbols)
          setAvailableSymbols(unifiedResponse.data.symbols.map((s: UnifiedSymbol) => s.symbol))
          setCategories(categoriesResponse.data || [])
          
          // Build availability from unified symbols
          const availability: Record<string, Record<string, boolean>> = {}
          unifiedResponse.data.symbols.forEach((s: UnifiedSymbol) => {
            availability[s.symbol] = {}
            Object.keys(s.exchanges || {}).forEach((ex) => {
              availability[s.symbol][ex] = s.exchanges[ex].isActive
            })
          })
          setSymbolAvailability(availability)
          
          console.log('[FRONTEND] Loaded unified symbols:', {
            count: unifiedResponse.data.symbols.length,
            categories: categoriesResponse.data?.length || 0,
          })
          logger.userAction('load_unified_symbols_success', { count: unifiedResponse.data.symbols.length })
          return
        }
      } catch (unifiedError) {
        console.warn('[FRONTEND] Unified symbols API failed, falling back to legacy:', unifiedError)
      }
      
      // Fallback to legacy symbols API
      const response = await api.get('/symbols')
      console.log('[FRONTEND] Symbols API response:', {
        symbols: response.data.symbols?.length || 0,
        availability: Object.keys(response.data.availability || {}).length,
        exchanges: response.data.exchanges?.length || 0,
        first10Symbols: response.data.symbols?.slice(0, 10),
      })
      setAvailableSymbols(response.data.symbols || [])
      setSymbolAvailability(response.data.availability || {})
      logger.userAction('load_available_symbols_success', { count: response.data.symbols?.length || 0 })
      
      if (!response.data.symbols || response.data.symbols.length === 0) {
        console.warn('[FRONTEND] WARNING: No symbols received from API!')
        toast.error(t('coins.noSymbolsInDB') || 'DB에 심볼이 없습니다. 서버를 재시작하면 자동으로 동기화됩니다.')
      }
    } catch (error: any) {
      console.error('[FRONTEND] Failed to load symbols:', error)
      logger.error('Failed to load symbols', error instanceof Error ? error : new Error(String(error)))
      toast.error(error.response?.data?.detail || t('coins.symbolsLoadError') || 'Failed to load symbols')
    } finally {
      setSymbolsLoading(false)
    }
  }

  const filteredSymbols = unifiedSymbols.length > 0 
    ? unifiedSymbols.filter((s) => {
        // Filter by search
        if (symbolSearch.trim()) {
          const search = symbolSearch.trim().toUpperCase()
          if (!s.symbol.toUpperCase().includes(search) && 
              !s.name.toUpperCase().includes(search)) {
            return false
          }
        }
        // Filter by category
        if (selectedCategory && s.category !== selectedCategory) {
          return false
        }
        return true
      }).map((s) => s.symbol)
    : availableSymbols.filter((symbol) => {
        if (!symbolSearch.trim()) return true
        return symbol.toUpperCase().includes(symbolSearch.trim().toUpperCase())
      })
  
  // Get unified symbol info by symbol name
  const getUnifiedSymbolInfo = (symbol: string): UnifiedSymbol | undefined => {
    return unifiedSymbols.find((s) => s.symbol === symbol)
  }

  const planLimits = {
    free: { max_coins: 1 },
    basic: { max_coins: 5 },
    pro: { max_coins: -1 },
    whale: { max_coins: -1 },
  }

  const limits = planLimits[user?.plan || 'free']
  const canAddMore = limits.max_coins === -1 || (user?.coins.length || 0) < limits.max_coins

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-50 mb-2">
            {t('coins.title')}
          </h1>
          <p className="text-sm sm:text-base text-neutral-300">
            {t('coins.description')}
          </p>
        </div>
        {canAddMore && (
          <button
            onClick={async () => {
              setShowAddModal(true)
              setSymbolSearch('')
              await loadAvailableSymbols()
            }}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            {t('coins.addCoin')}
          </button>
        )}
      </div>

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="card p-4 bg-amber-900/30 border-amber-700/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {t('coins.limitReached') || 'Coin limit reached'}
              </p>
              <p className="text-sm text-amber-300">
                {t('coins.limitReachedDesc') || 'Upgrade your plan to monitor more coins.'}
              </p>
            </div>
            <a
              href="/subscription"
              className="btn-primary text-sm whitespace-nowrap"
            >
              {t('dashboard.upgrade')}
            </a>
          </div>
        </div>
      )}

      {/* Coins List */}
      {coins.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <p className="text-neutral-400 text-sm sm:text-base">{t('coins.noCoins')}</p>
          {canAddMore && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 btn-primary"
            >
              {t('coins.addCoin')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {coins.map((coin) => (
            <div
              key={coin.symbol}
              className="card p-4 sm:p-6 hover:shadow-soft-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-100 mb-1">
                    {coin.symbol}
                  </h3>
                  {coin.price && (
                    <p className="text-sm sm:text-base text-neutral-300">
                      ${coin.price.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      })}
                      {coin.change_24h && (
                        <span
                          className={`ml-2 font-medium ${
                            coin.change_24h >= 0 ? 'text-teal-400' : 'text-red-400'
                          }`}
                        >
                          {coin.change_24h >= 0 ? '+' : ''}
                          {coin.change_24h.toFixed(2)}%
                        </span>
                      )}
                    </p>
                  )}
                </div>
              <button
                onClick={() => removeCoin(coin.symbol)}
                disabled={actionLoading[`remove-${coin.symbol}`]}
                className="ml-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('coins.remove')}
              >
                {actionLoading[`remove-${coin.symbol}`] ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </button>
              </div>
              
              {/* Threshold 설정 */}
              <div className="border-t border-neutral-700/50 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400 mb-1">
                      {t('coins.threshold') || 'Alert Threshold'}
                    </p>
                    {editingThreshold === coin.symbol ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={thresholdValue}
                          onChange={(e) => setThresholdValue(e.target.value)}
                          placeholder={user?.threshold?.toString() || '0.07'}
                          min="0.01"
                          max="10.0"
                          step="0.01"
                          className="input flex-1 text-sm py-1.5"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = thresholdValue === '' ? null : parseFloat(thresholdValue)
                              if (value === null || (!isNaN(value) && value >= 0.01 && value <= 10.0)) {
                                updateCoinThreshold(coin.symbol, value)
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const value = thresholdValue === '' ? null : parseFloat(thresholdValue)
                            if (value === null || (!isNaN(value) && value >= 0.01 && value <= 10.0)) {
                              updateCoinThreshold(coin.symbol, value)
                            } else {
                              toast.error(t('settings.customValueDesc'))
                            }
                          }}
                          disabled={actionLoading[`threshold-${coin.symbol}`]}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {actionLoading[`threshold-${coin.symbol}`] ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('common.saving') || 'Saving...'}
                            </>
                          ) : (
                            t('common.save')
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingThreshold(null)
                            setThresholdValue('')
                          }}
                          className="px-3 py-1.5 bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium hover:bg-neutral-600 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-100">
                          {coin.threshold !== null && coin.threshold !== undefined
                            ? `${coin.threshold.toFixed(2)}%`
                            : `${user?.threshold || 0.07}% (${t('coins.default') || 'Default'})`}
                        </p>
                        <button
                          onClick={() => startEditingThreshold(coin)}
                          className="p-1.5 text-neutral-400 hover:text-teal-400 hover:bg-teal-900/20 rounded-lg transition-all duration-200"
                          title={t('coins.editThreshold') || 'Edit threshold'}
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Coin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in my-8">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 mb-4">
              {t('coins.addCoin')}
            </h2>

            {/* Stats Banner */}
            <div className="mb-6 p-4 bg-gradient-to-r from-teal-900/30 to-ocean-900/30 border border-teal-700/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-teal-300">
                    {t('coins.supportedSymbols') || '200+ Supported Symbols'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {t('coins.supportedSymbolsDesc') || 'Top cryptocurrencies across 8 major exchanges'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-teal-400">{availableSymbols.length}</p>
                  <p className="text-xs text-neutral-400">{t('coins.available') || 'Available'}</p>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('coins.filterByCategory') || 'Filter by Category'}:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedCategory === null
                        ? 'bg-teal-600 text-white'
                        : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-600/50'
                    }`}
                  >
                    {t('common.all') || 'All'}
                  </button>
                  {categories.slice(0, 10).map((cat) => {
                    const config = CATEGORY_CONFIG[cat] || { icon: CoinsIcon, color: 'text-neutral-400', label: cat }
                    const IconComponent = config.icon
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                          selectedCategory === cat
                            ? 'bg-teal-600 text-white'
                            : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-600/50'
                        }`}
                      >
                        <IconComponent className={`h-3 w-3 ${selectedCategory === cat ? 'text-white' : config.color}`} />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Popular Coins */}
            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-300 mb-3">
                {t('coins.popularCoins') || 'Popular Coins'} (Top 20):
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {POPULAR_COINS.filter(
                  (c) => !coins.some((coin) => coin.symbol === c) && availableSymbols.includes(c)
                ).slice(0, 10).map((symbol) => {
                  const symbolInfo = getUnifiedSymbolInfo(symbol)
                  return (
                    <button
                      key={symbol}
                      onClick={() => addCoin(symbol)}
                      disabled={actionLoading[`add-${symbol}`]}
                      className="px-3 py-2 border border-teal-600/50 bg-teal-900/30 text-teal-300 rounded-xl hover:bg-teal-900/40 hover:border-teal-500/50 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-0.5"
                      title={symbolInfo?.name || symbol}
                    >
                      {actionLoading[`add-${symbol}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>{symbol}</span>
                          {symbolInfo?.rank && (
                            <span className="text-[10px] text-neutral-500">#{symbolInfo.rank}</span>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
              {POPULAR_COINS.filter(
                (c) => !coins.some((coin) => coin.symbol === c) && availableSymbols.includes(c)
              ).length === 0 && (
                <p className="text-xs text-neutral-500 mt-2">
                  {t('coins.allPopularAdded') || '모든 인기 코인이 추가되었습니다'}
                </p>
              )}
            </div>

            {/* Search All Symbols */}
            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-300 mb-2">
                {t('coins.searchAllSymbols') || 'Search All Symbols'}:
                {!symbolsLoading && availableSymbols.length > 0 && (
                  <span className="ml-2 text-xs text-neutral-400">
                    ({availableSymbols.length} {t('coins.symbolsAvailable') || 'symbols available'})
                  </span>
                )}
              </p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  placeholder={
                    symbolsLoading
                      ? t('coins.loadingSymbols') || 'Loading symbols...'
                      : t('coins.searchPlaceholder') || `Search from ${availableSymbols.length} symbols (e.g., BTC, ETH)...`
                  }
                  className="input pl-10 w-full"
                  disabled={symbolsLoading}
                />
              </div>

              {symbolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                  <span className="ml-2 text-sm text-neutral-300">
                    {t('coins.loadingSymbols') || 'Loading symbols...'}
                  </span>
                </div>
              ) : availableSymbols.length === 0 ? (
                <div className="border border-neutral-700 rounded-xl p-8 text-center">
                  <p className="text-sm text-neutral-400">
                    {t('coins.noSymbols') || 'No symbols available'}
                  </p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto border border-neutral-700 rounded-xl p-4">
                  {!symbolSearch.trim() ? (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-neutral-500 mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-neutral-400 mb-1">
                        {t('coins.searchHint') || '검색어를 입력하여 심볼을 찾아보세요'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {t('coins.searchExample') || '예: BTC, ETH, SOL 등'}
                      </p>
                    </div>
                  ) : filteredSymbols.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-neutral-500 mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-neutral-400 mb-1">
                        {t('coins.noSymbolsFound') || '검색 결과가 없습니다'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        "{symbolSearch}" {t('coins.tryDifferentSearch') || '에 대한 결과를 찾을 수 없습니다. 다른 검색어를 시도해보세요.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-neutral-400">
                          {filteredSymbols.length} {t('coins.symbolsFound') || '개 심볼 발견'}
                        </p>
                        {filteredSymbols.length > 20 && (
                          <p className="text-xs text-neutral-500">
                            {t('coins.scrollToSeeMore') || '스크롤하여 더 보기'}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {filteredSymbols.map((symbol) => {
                        const isAdded = coins.some((coin) => coin.symbol === symbol)
                        const availability = symbolAvailability[symbol] || {}
                        const supportedExchanges = Object.entries(availability)
                          .filter(([_, supported]) => supported)
                          .map(([ex]) => ex)
                        const allExchanges = Object.keys(availability)
                        const isFullySupported = allExchanges.length > 0 && supportedExchanges.length === allExchanges.length
                        const symbolInfo = getUnifiedSymbolInfo(symbol)
                        const categoryConfig = symbolInfo?.category ? CATEGORY_CONFIG[symbolInfo.category] : null

                        return (
                          <button
                            key={symbol}
                            onClick={() => !isAdded && addCoin(symbol)}
                            disabled={isAdded || actionLoading[`add-${symbol}`]}
                            title={`${symbolInfo?.name || symbol}${symbolInfo?.rank ? ` (#${symbolInfo.rank})` : ''} - ${
                              isAdded
                                ? t('coins.alreadyAdded') || 'Already added'
                                : supportedExchanges.length === 0
                                ? t('coins.notSupported') || 'Not supported'
                                : supportedExchanges.length < allExchanges.length
                                ? `Supported: ${supportedExchanges.join(', ')}`
                                : t('coins.fullySupported') || 'All exchanges'
                            }`}
                            className={`px-3 py-3 border rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-start gap-1 ${
                              isAdded
                                ? 'border-neutral-700 bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : isFullySupported
                                ? 'border-teal-600/50 bg-teal-900/30 text-teal-300 hover:bg-teal-900/40'
                                : supportedExchanges.length > 0
                                ? 'border-amber-600/50 bg-amber-900/30 text-amber-300 hover:bg-amber-900/40'
                                : 'border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                            }`}
                          >
                            {actionLoading[`add-${symbol}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              <>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="font-semibold">{symbol}</span>
                                  {symbolInfo?.rank && symbolInfo.rank <= 50 && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-teal-600/30 text-teal-400 rounded">
                                      #{symbolInfo.rank}
                                    </span>
                                  )}
                                </div>
                                {symbolInfo?.name && (
                                  <span className="text-[10px] text-neutral-500 truncate w-full">
                                    {symbolInfo.name}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 w-full">
                                  {categoryConfig && (
                                    <span className={`text-[10px] ${categoryConfig.color}`}>
                                      {categoryConfig.label}
                                    </span>
                                  )}
                                  {!isFullySupported && supportedExchanges.length > 0 && (
                                    <span className="text-[10px] text-amber-400 ml-auto">
                                      ⚠ {supportedExchanges.length}/{allExchanges.length}
                                    </span>
                                  )}
                                  {supportedExchanges.length === 0 && (
                                    <span className="text-[10px] text-red-400 ml-auto">✗</span>
                                  )}
                                </div>
                              </>
                            )}
                          </button>
                        )
                      })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSymbolSearch('')
                }}
                className="flex-1 btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




