import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import api from '../../services/api'
import { 
  Users, 
  TrendingUp, 
  Bell, 
  CreditCard, 
  Activity, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  PieChart,
  Zap
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  subscriptionStats: {
    free: number
    basic: number
    pro: number
    whale: number
  }
  alertStats: {
    totalAlerts: number
    alertsToday: number
    alertsThisWeek: number
    avgAlertsPerUser: number
  }
  coinStats: {
    totalCoins: number
    avgCoinsPerUser: number
    topCoins: { symbol: string; count: number }[]
  }
  exchangeStats: {
    totalActiveExchanges: number
    exchangeUsage: { exchangeId: string; count: number }[]
  }
  symbolStats: {
    totalSymbols: number
    activeSymbols: number
    totalMappings: number
  }
}

interface ChartData {
  date: string
  value: number
  label?: string
}

export default function AdminDashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [userGrowth, setUserGrowth] = useState<ChartData[]>([])
  const [alertTrend, setAlertTrend] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [dashRes, growthRes, alertRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/charts/user-growth?days=14'),
        api.get('/admin/charts/alert-trend?days=14'),
      ])

      setStats(dashRes.data.data)
      setUserGrowth(growthRes.data.data.map((d: any) => ({
        date: d.date,
        value: d.newUsers,
        label: `${d.newUsers} new`
      })))
      setAlertTrend(alertRes.data.data.map((d: any) => ({
        date: d.date,
        value: d.count,
        label: `${d.count} alerts`
      })))
    } catch (error) {
      console.error('Failed to load admin dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (type: 'symbols' | 'coingecko') => {
    setSyncing(true)
    try {
      await api.post(`/admin/sync/${type}`)
      await loadDashboard()
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">Failed to load dashboard data</p>
        <button onClick={loadDashboard} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      change: stats.newUsersToday,
      changeLabel: 'today',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
      change: Math.round((stats.activeUsers / stats.totalUsers) * 100),
      changeLabel: '% of total',
      isPercent: true,
    },
    {
      title: 'Total Alerts',
      value: stats.alertStats.totalAlerts,
      icon: Bell,
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/30',
      change: stats.alertStats.alertsToday,
      changeLabel: 'today',
    },
    {
      title: 'Paid Users',
      value: stats.subscriptionStats.basic + stats.subscriptionStats.pro + stats.subscriptionStats.whale,
      icon: CreditCard,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      change: Math.round(((stats.subscriptionStats.basic + stats.subscriptionStats.pro + stats.subscriptionStats.whale) / stats.totalUsers) * 100),
      changeLabel: '% conversion',
      isPercent: true,
    },
  ]

  const maxGrowth = Math.max(...userGrowth.map(d => d.value), 1)
  const maxAlerts = Math.max(...alertTrend.map(d => d.value), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50">Admin Dashboard</h1>
          <p className="text-neutral-400 mt-1">System overview and statistics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync('symbols')}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Symbols
          </button>
          <button
            onClick={loadDashboard}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="flex items-center gap-1 text-sm">
                {card.change > 0 && !card.isPercent && (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                )}
                <span className={card.change > 0 ? 'text-green-400' : 'text-neutral-400'}>
                  {card.isPercent ? '' : '+'}{card.change}{card.isPercent ? '%' : ''} {card.changeLabel}
                </span>
              </div>
            </div>
            <p className="text-3xl font-bold text-neutral-50">{card.value.toLocaleString()}</p>
            <p className="text-sm text-neutral-400 mt-1">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-400" />
              <h3 className="text-lg font-semibold text-neutral-100">New Users (14 days)</h3>
            </div>
            <span className="text-sm text-neutral-400">
              Total: {userGrowth.reduce((sum, d) => sum + d.value, 0)}
            </span>
          </div>
          <div className="h-48 flex items-end gap-1">
            {userGrowth.map((d, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${d.date}: ${d.value} users`}
              >
                <span className="text-xs text-neutral-400">{d.value}</span>
                <div
                  className="w-full bg-teal-500 rounded-t transition-all duration-300 hover:bg-teal-400"
                  style={{ height: `${(d.value / maxGrowth) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-neutral-500 rotate-45 origin-left">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Trend Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-neutral-100">Alerts (14 days)</h3>
            </div>
            <span className="text-sm text-neutral-400">
              Total: {alertTrend.reduce((sum, d) => sum + d.value, 0)}
            </span>
          </div>
          <div className="h-48 flex items-end gap-1">
            {alertTrend.map((d, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${d.date}: ${d.value} alerts`}
              >
                <span className="text-xs text-neutral-400">{d.value}</span>
                <div
                  className="w-full bg-amber-500 rounded-t transition-all duration-300 hover:bg-amber-400"
                  style={{ height: `${(d.value / maxAlerts) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-neutral-500 rotate-45 origin-left">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription & System Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Breakdown */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-neutral-100">Subscriptions</h3>
          </div>
          <div className="space-y-3">
            {[
              { plan: 'Free', count: stats.subscriptionStats.free, color: 'bg-neutral-500' },
              { plan: 'Basic', count: stats.subscriptionStats.basic, color: 'bg-blue-500' },
              { plan: 'Pro', count: stats.subscriptionStats.pro, color: 'bg-purple-500' },
              { plan: 'Whale', count: stats.subscriptionStats.whale, color: 'bg-amber-500' },
            ].map((sub) => {
              const percent = stats.totalUsers > 0 ? (sub.count / stats.totalUsers) * 100 : 0
              return (
                <div key={sub.plan} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sub.color}`} />
                  <span className="text-sm text-neutral-300 flex-1">{sub.plan}</span>
                  <span className="text-sm font-medium text-neutral-100">{sub.count}</span>
                  <span className="text-xs text-neutral-400 w-12 text-right">
                    {percent.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Coins */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-neutral-100">Top Coins</h3>
          </div>
          <div className="space-y-2">
            {stats.coinStats.topCoins.slice(0, 5).map((coin, idx) => (
              <div key={coin.symbol} className="flex items-center gap-3">
                <span className="text-sm text-neutral-500 w-4">{idx + 1}</span>
                <span className="text-sm font-medium text-neutral-100 flex-1">{coin.symbol}</span>
                <span className="text-sm text-neutral-400">{coin.count} users</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-neutral-100">System Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Symbols</span>
              <span className="text-sm font-medium text-neutral-100">
                {stats.symbolStats.activeSymbols} / {stats.symbolStats.totalSymbols}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Exchange Mappings</span>
              <span className="text-sm font-medium text-neutral-100">
                {stats.symbolStats.totalMappings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Avg Coins/User</span>
              <span className="text-sm font-medium text-neutral-100">
                {stats.coinStats.avgCoinsPerUser}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300">Avg Alerts/User</span>
              <span className="text-sm font-medium text-neutral-100">
                {stats.alertStats.avgAlertsPerUser}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Usage */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-neutral-100">Exchange Usage</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {stats.exchangeStats.exchangeUsage.map((ex) => (
            <div key={ex.exchangeId} className="text-center p-4 bg-neutral-800/50 rounded-xl">
              <p className="text-2xl font-bold text-neutral-100">{ex.count}</p>
              <p className="text-xs text-neutral-400 mt-1 uppercase">{ex.exchangeId}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

