import { useEffect, useState, useMemo } from 'react'
import api from '../../services/api'
import { 
  Building2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  Bell,
  Database,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null
type ExchangeSortField = 'name' | 'status' | 'symbols' | 'users' | 'buyAlerts' | 'sellAlerts' | 'coverage'

interface ExchangeStatus {
  exchangeId: string
  name: string
  emoji: string
  symbols: {
    total: number
    active: number
  }
  users: number
  alerts24h: {
    asBuy: number
    asSell: number
    total: number
  }
  status: string
}

export default function AdminExchanges() {
  const [exchanges, setExchanges] = useState<ExchangeStatus[]>([])
  const [loading, setLoading] = useState(true)
  
  // Sorting
  const [sortField, setSortField] = useState<ExchangeSortField>('symbols')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: ExchangeSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedExchanges = useMemo(() => {
    if (!sortDirection) return exchanges
    
    return [...exchanges].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'status':
          aVal = a.status === 'active' ? 1 : 0
          bVal = b.status === 'active' ? 1 : 0
          break
        case 'symbols':
          aVal = a.symbols.active
          bVal = b.symbols.active
          break
        case 'users':
          aVal = a.users
          bVal = b.users
          break
        case 'buyAlerts':
          aVal = a.alerts24h.asBuy
          bVal = b.alerts24h.asBuy
          break
        case 'sellAlerts':
          aVal = a.alerts24h.asSell
          bVal = b.alerts24h.asSell
          break
        case 'coverage':
          aVal = a.symbols.total > 0 ? (a.symbols.active / a.symbols.total) : 0
          bVal = b.symbols.total > 0 ? (b.symbols.active / b.symbols.total) : 0
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [exchanges, sortField, sortDirection])

  const SortHeader = ({ field, children, align = 'left' }: { field: ExchangeSortField; children: React.ReactNode; align?: 'left' | 'right' }) => (
    <th 
      className={`py-3 px-4 text-sm font-medium text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {children}
        <span className="w-4">
          {sortField === field && sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
          {sortField === field && sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
    </th>
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/exchanges')
      setExchanges(response.data.data)
    } catch (error) {
      console.error('Failed to load exchanges:', error)
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

  // Calculate totals
  const totalSymbols = exchanges.reduce((sum, e) => sum + e.symbols.active, 0)
  const totalUsers = exchanges.reduce((sum, e) => sum + e.users, 0)
  const totalAlerts = exchanges.reduce((sum, e) => sum + e.alerts24h.total, 0)
  const activeExchanges = exchanges.filter(e => e.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-400" />
            Exchange Status
          </h1>
          <p className="text-neutral-400 mt-1">
            {activeExchanges} of {exchanges.length} exchanges active
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Database className="h-6 w-6 text-teal-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-100">{totalSymbols}</p>
          <p className="text-xs text-neutral-400">Total Symbol Mappings</p>
        </div>
        <div className="card p-4 text-center">
          <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-100">{totalUsers}</p>
          <p className="text-xs text-neutral-400">Active Exchange Users</p>
        </div>
        <div className="card p-4 text-center">
          <Bell className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-100">{totalAlerts}</p>
          <p className="text-xs text-neutral-400">Alerts (24h)</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-100">{activeExchanges}/{exchanges.length}</p>
          <p className="text-xs text-neutral-400">Exchanges Active</p>
        </div>
      </div>

      {/* Exchange Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {exchanges.map((exchange) => (
          <div
            key={exchange.exchangeId}
            className={`card p-6 border-2 transition-all duration-200 hover:scale-105 ${
              exchange.status === 'active'
                ? 'border-green-500/30 bg-green-900/10'
                : 'border-red-500/30 bg-red-900/10'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{exchange.emoji}</span>
                <span className="font-semibold text-neutral-100">{exchange.name}</span>
              </div>
              {exchange.status === 'active' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Symbols
                </span>
                <span className="text-sm font-medium text-neutral-100">
                  {exchange.symbols.active} / {exchange.symbols.total}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </span>
                <span className="text-sm font-medium text-neutral-100">
                  {exchange.users}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Alerts (24h)
                </span>
                <span className="text-sm font-medium text-neutral-100">
                  {exchange.alerts24h.total}
                </span>
              </div>
            </div>

            {/* Alert breakdown */}
            {exchange.alerts24h.total > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400">Buy: {exchange.alerts24h.asBuy}</span>
                  <span className="text-red-400">Sell: {exchange.alerts24h.asSell}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Exchange Comparison Table */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Exchange Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-700">
                <SortHeader field="name">Exchange</SortHeader>
                <SortHeader field="status" align="right">Status</SortHeader>
                <SortHeader field="symbols" align="right">Symbols</SortHeader>
                <SortHeader field="users" align="right">Users</SortHeader>
                <SortHeader field="buyAlerts" align="right">Buy Alerts</SortHeader>
                <SortHeader field="sellAlerts" align="right">Sell Alerts</SortHeader>
                <SortHeader field="coverage" align="right">Coverage</SortHeader>
              </tr>
            </thead>
            <tbody>
              {sortedExchanges.map((exchange) => {
                const coverage = exchange.symbols.total > 0
                  ? ((exchange.symbols.active / exchange.symbols.total) * 100).toFixed(0)
                  : 0
                return (
                  <tr key={exchange.exchangeId} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span>{exchange.emoji}</span>
                        <span className="font-medium text-neutral-100">{exchange.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        exchange.status === 'active'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {exchange.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-neutral-300">
                      {exchange.symbols.active}
                    </td>
                    <td className="py-4 px-4 text-right text-neutral-300">
                      {exchange.users}
                    </td>
                    <td className="py-4 px-4 text-right text-green-400">
                      {exchange.alerts24h.asBuy}
                    </td>
                    <td className="py-4 px-4 text-right text-red-400">
                      {exchange.alerts24h.asSell}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-neutral-800 rounded overflow-hidden">
                          <div
                            className={`h-full ${
                              Number(coverage) >= 80 ? 'bg-green-500' :
                              Number(coverage) >= 50 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-400">{coverage}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

