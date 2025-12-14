import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  Server, 
  Database, 
  Bell,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap,
  Clock
} from 'lucide-react'

interface SystemHealth {
  symbolSync: {
    totalSymbols: number
    activeSymbols: number
    totalMappings: number
    status: string
  }
  alertSystem: {
    alertsLastHour: number
    status: string
  }
  database: {
    status: string
  }
}

interface SubscriptionAnalytics {
  subscriptionStats: {
    plan: string
    count: number
    revenue: number
  }[]
  monthlyRevenue: number
  conversionRate: number
  paidUsers: number
  freeUsers: number
}

export default function AdminSystem() {
  const toast = useToast()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [healthRes, subRes] = await Promise.all([
        api.get('/admin/system-health'),
        api.get('/admin/subscriptions'),
      ])
      setHealth(healthRes.data.data)
      setSubscriptions(subRes.data.data)
    } catch (error) {
      console.error('Failed to load system data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (type: 'symbols' | 'coingecko') => {
    setSyncing(type)
    try {
      await api.post(`/admin/sync/${type}`)
      toast.success(`${type === 'symbols' ? 'Symbol' : 'CoinGecko'} sync completed`)
      await loadData()
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error)
      toast.error(`${type} sync failed`)
    } finally {
      setSyncing(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
      default:
        return <Clock className="h-5 w-5 text-neutral-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/50 bg-green-900/20'
      case 'warning':
        return 'border-amber-500/50 bg-amber-900/20'
      case 'error':
        return 'border-red-500/50 bg-red-900/20'
      default:
        return 'border-neutral-700 bg-neutral-800/50'
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
            <Server className="h-8 w-8 text-teal-400" />
            System Status
          </h1>
          <p className="text-neutral-400 mt-1">Monitor system health and run maintenance tasks</p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Health Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Symbol Sync */}
          <div className={`card p-6 border-2 ${getStatusColor(health.symbolSync.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-neutral-100">Symbol Sync</h3>
              </div>
              {getStatusIcon(health.symbolSync.status)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Total Symbols</span>
                <span className="text-sm font-medium text-neutral-100">
                  {health.symbolSync.totalSymbols}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Active Symbols</span>
                <span className="text-sm font-medium text-neutral-100">
                  {health.symbolSync.activeSymbols}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Exchange Mappings</span>
                <span className="text-sm font-medium text-neutral-100">
                  {health.symbolSync.totalMappings}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleSync('symbols')}
              disabled={syncing === 'symbols'}
              className="mt-4 w-full btn-secondary text-sm flex items-center justify-center gap-2"
            >
              {syncing === 'symbols' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Symbols
                </>
              )}
            </button>
          </div>

          {/* Alert System */}
          <div className={`card p-6 border-2 ${getStatusColor(health.alertSystem.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-neutral-100">Alert System</h3>
              </div>
              {getStatusIcon(health.alertSystem.status)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Alerts (Last Hour)</span>
                <span className="text-sm font-medium text-neutral-100">
                  {health.alertSystem.alertsLastHour}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Status</span>
                <span className={`text-sm font-medium ${
                  health.alertSystem.status === 'healthy' ? 'text-green-400' : 'text-amber-400'
                }`}>
                  {health.alertSystem.status === 'healthy' ? 'Active' : 'No recent alerts'}
                </span>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className={`card p-6 border-2 ${getStatusColor(health.database.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                <h3 className="font-semibold text-neutral-100">Database</h3>
              </div>
              {getStatusIcon(health.database.status)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Status</span>
                <span className="text-sm font-medium text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-400">Type</span>
                <span className="text-sm font-medium text-neutral-100">PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Overview */}
      {subscriptions && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-neutral-100 mb-6">Revenue Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="p-4 bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-xl">
              <p className="text-sm text-neutral-400 mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                ${subscriptions.monthlyRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-neutral-800/50 rounded-xl">
              <p className="text-sm text-neutral-400 mb-1">Paid Users</p>
              <p className="text-2xl font-bold text-neutral-100">{subscriptions.paidUsers}</p>
            </div>
            <div className="p-4 bg-neutral-800/50 rounded-xl">
              <p className="text-sm text-neutral-400 mb-1">Free Users</p>
              <p className="text-2xl font-bold text-neutral-100">{subscriptions.freeUsers}</p>
            </div>
            <div className="p-4 bg-neutral-800/50 rounded-xl">
              <p className="text-sm text-neutral-400 mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-neutral-100">{subscriptions.conversionRate}%</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-3 text-sm font-medium text-neutral-400">Plan</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-400">Users</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-400">Revenue</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-400">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.subscriptionStats.map((stat) => {
                  const total = subscriptions.freeUsers + subscriptions.paidUsers
                  const percent = total > 0 ? (stat.count / total) * 100 : 0
                  return (
                    <tr key={stat.plan} className="border-b border-neutral-800">
                      <td className="py-3 font-medium text-neutral-100 capitalize">{stat.plan}</td>
                      <td className="py-3 text-right text-neutral-300">{stat.count}</td>
                      <td className="py-3 text-right text-neutral-300">
                        ${stat.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-neutral-400">{percent.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">Maintenance Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => handleSync('symbols')}
            disabled={syncing === 'symbols'}
            className="p-4 bg-neutral-800/50 rounded-xl text-left hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-neutral-100">Sync Symbols</span>
            </div>
            <p className="text-xs text-neutral-400">
              Fetch latest symbols from Binance and update exchange mappings
            </p>
          </button>

          <button
            onClick={() => handleSync('coingecko')}
            disabled={syncing === 'coingecko'}
            className="p-4 bg-neutral-800/50 rounded-xl text-left hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-green-400" />
              <span className="font-medium text-neutral-100">Sync CoinGecko</span>
            </div>
            <p className="text-xs text-neutral-400">
              Update CoinGecko IDs and exchange symbol mappings
            </p>
          </button>

          <button
            onClick={loadData}
            className="p-4 bg-neutral-800/50 rounded-xl text-left hover:bg-neutral-700/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="h-5 w-5 text-teal-400" />
              <span className="font-medium text-neutral-100">Refresh Status</span>
            </div>
            <p className="text-xs text-neutral-400">
              Reload all system health and status information
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

