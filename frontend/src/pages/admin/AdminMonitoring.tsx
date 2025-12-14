import { useEffect, useState, useRef, useMemo } from 'react'
import api from '../../services/api'
import { 
  Activity, 
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle,
  Zap,
  ArrowRight,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null
type OpportunitySortField = 'symbol' | 'spread' | 'buyPrice' | 'sellPrice' | 'timestamp'

interface MonitoringData {
  timestamp: string
  alerts: {
    last5Min: number
    last1Hour: number
    last24Hours: number
    avgSpread: number
    maxSpread: number
  }
  topOpportunities: {
    symbol: string
    spread: number
    buyExchange: string
    sellExchange: string
    buyPrice: number
    sellPrice: number
    potentialProfit: number
    timestamp: string
  }[]
  exchangePairFrequency: { pair: string; count: number }[]
  symbolFrequency: { symbol: string; count: number }[]
  recentAlerts: {
    id: string
    symbol: string
    spread: number
    buyExchange: string
    sellExchange: string
    timestamp: string
  }[]
}

export default function AdminMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sorting for opportunities table
  const [sortField, setSortField] = useState<OpportunitySortField>('spread')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: OpportunitySortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedOpportunities = useMemo(() => {
    if (!data?.topOpportunities || !sortDirection) return data?.topOpportunities || []
    
    return [...data.topOpportunities].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'symbol':
          aVal = a.symbol.toLowerCase()
          bVal = b.symbol.toLowerCase()
          break
        case 'spread':
          aVal = a.spread
          bVal = b.spread
          break
        case 'buyPrice':
          aVal = a.buyPrice
          bVal = b.buyPrice
          break
        case 'sellPrice':
          aVal = a.sellPrice
          bVal = b.sellPrice
          break
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime()
          bVal = new Date(b.timestamp).getTime()
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [data?.topOpportunities, sortField, sortDirection])

  const SortHeader = ({ field, children, align = 'left' }: { field: OpportunitySortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => (
    <th 
      className={`py-2 px-3 text-xs font-medium text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors select-none ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
        {children}
        <span className="w-3">
          {sortField === field && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
          {sortField === field && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
        </span>
      </div>
    </th>
  )

  useEffect(() => {
    loadData()
    
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 10000) // 10초마다 갱신
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh])

  const loadData = async () => {
    try {
      const response = await api.get('/admin/monitoring')
      setData(response.data.data)
    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50 flex items-center gap-2">
            <Activity className="h-8 w-8 text-green-400" />
            Real-Time Monitoring
          </h1>
          <p className="text-neutral-400 mt-1">
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded bg-neutral-700 border-neutral-600 text-teal-500 focus:ring-teal-500"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={loadData}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-neutral-400">Last 5 min</span>
          </div>
          <p className="text-2xl font-bold text-neutral-100">{data?.alerts.last5Min || 0}</p>
          <p className="text-xs text-neutral-500">alerts</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-green-400" />
            <span className="text-xs text-neutral-400">Last 1 hour</span>
          </div>
          <p className="text-2xl font-bold text-neutral-100">{data?.alerts.last1Hour || 0}</p>
          <p className="text-xs text-neutral-500">alerts</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-neutral-400">Last 24 hours</span>
          </div>
          <p className="text-2xl font-bold text-neutral-100">{data?.alerts.last24Hours || 0}</p>
          <p className="text-xs text-neutral-500">alerts</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-neutral-400">Avg Spread</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{data?.alerts.avgSpread?.toFixed(2) || 0}%</p>
          <p className="text-xs text-neutral-500">average</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-red-400" />
            <span className="text-xs text-neutral-400">Max Spread</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{data?.alerts.maxSpread?.toFixed(2) || 0}%</p>
          <p className="text-xs text-neutral-500">maximum</p>
        </div>
      </div>

      {/* Top Opportunities */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-neutral-100">Top Arbitrage Opportunities</h3>
        </div>
        {sortedOpportunities && sortedOpportunities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <SortHeader field="symbol">Symbol</SortHeader>
                  <SortHeader field="spread" align="center">Spread</SortHeader>
                  <th className="text-center py-2 px-3 text-xs font-medium text-neutral-400">Route</th>
                  <SortHeader field="buyPrice" align="right">Buy Price</SortHeader>
                  <SortHeader field="sellPrice" align="right">Sell Price</SortHeader>
                  <SortHeader field="timestamp" align="right">Time</SortHeader>
                </tr>
              </thead>
              <tbody>
                {sortedOpportunities.map((opp, idx) => (
                  <tr key={idx} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="py-3 px-3 font-medium text-neutral-100">{opp.symbol}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        opp.spread >= 2 ? 'bg-green-900/50 text-green-400' :
                        opp.spread >= 1 ? 'bg-amber-900/50 text-amber-400' :
                        'bg-neutral-700 text-neutral-300'
                      }`}>
                        {opp.spread.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-sm text-neutral-300">
                        {opp.buyExchange}
                        <ArrowRight className="inline h-3 w-3 mx-1 text-neutral-500" />
                        {opp.sellExchange}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-neutral-300">
                      ${opp.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-neutral-300">
                      ${opp.sellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-neutral-500">
                      {new Date(opp.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-8">No recent opportunities</p>
        )}
      </div>

      {/* Frequency Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symbol Frequency */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">Top Symbols (Last Hour)</h3>
          <div className="space-y-2">
            {data?.symbolFrequency?.map((item, idx) => {
              const maxCount = data.symbolFrequency[0]?.count || 1
              const width = (item.count / maxCount) * 100
              return (
                <div key={item.symbol} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400 w-6">{idx + 1}</span>
                  <span className="text-sm font-medium text-neutral-100 w-16">{item.symbol}</span>
                  <div className="flex-1 h-6 bg-neutral-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600 to-teal-400 flex items-center justify-end pr-2"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data?.symbolFrequency || data.symbolFrequency.length === 0) && (
              <p className="text-center text-neutral-500 py-4">No data</p>
            )}
          </div>
        </div>

        {/* Exchange Pair Frequency */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">Top Exchange Routes (Last Hour)</h3>
          <div className="space-y-2">
            {data?.exchangePairFrequency?.map((item, idx) => {
              const maxCount = data.exchangePairFrequency[0]?.count || 1
              const width = (item.count / maxCount) * 100
              return (
                <div key={item.pair} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400 w-6">{idx + 1}</span>
                  <span className="text-sm font-medium text-neutral-100 w-32 truncate">{item.pair}</span>
                  <div className="flex-1 h-6 bg-neutral-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-end pr-2"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data?.exchangePairFrequency || data.exchangePairFrequency.length === 0) && (
              <p className="text-center text-neutral-500 py-4">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts Stream */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Recent Alerts Stream</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data?.recentAlerts?.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="font-medium text-neutral-100">{alert.symbol}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  alert.spread >= 2 ? 'bg-green-900/50 text-green-400' :
                  alert.spread >= 1 ? 'bg-amber-900/50 text-amber-400' :
                  'bg-neutral-700 text-neutral-300'
                }`}>
                  {alert.spread.toFixed(2)}%
                </span>
                <span className="text-sm text-neutral-400">
                  {alert.buyExchange} → {alert.sellExchange}
                </span>
              </div>
              <span className="text-xs text-neutral-500">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {(!data?.recentAlerts || data.recentAlerts.length === 0) && (
            <p className="text-center text-neutral-500 py-8">No recent alerts</p>
          )}
        </div>
      </div>
    </div>
  )
}

