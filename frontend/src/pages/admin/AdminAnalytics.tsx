import { useEffect, useState } from 'react'
import api from '../../services/api'
import { 
  BarChart3, 
  PieChart,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  DollarSign,
  Clock
} from 'lucide-react'

interface UserAnalytics {
  activeUsers: {
    lastWeek: number
    lastMonth: number
    total: number
  }
  activityDistribution: {
    inactive: number
    low: number
    medium: number
    high: number
    veryHigh: number
  }
  coinPopularity: { symbol: string; userCount: number }[]
  exchangePopularity: { exchangeId: string; userCount: number }[]
  retention: { week: number; rate: number; retained: number; total: number }[]
}

interface AlertAnalytics {
  byHour: { hour: number; count: number; avgSpread: number }[]
  bySymbol: { symbol: string; count: number; avgSpread: number; maxSpread: number }[]
  byExchangePair: { pair: string; count: number; avgSpread: number }[]
  spreadDistribution: { label: string; count: number }[]
  dailySummary: { date: string; count: number; avgSpread: number }[]
}

interface RevenueMetrics {
  mrr: number
  arr: number
  newPaidUsersThisMonth: number
  avgRevenuePerPaidUser: number
  subscriptionBreakdown: {
    plan: string
    count: number
    revenue: number
    percentage: number
  }[]
}

export default function AdminAnalytics() {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [alertAnalytics, setAlertAnalytics] = useState<AlertAnalytics | null>(null)
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'alerts' | 'revenue'>('users')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [userRes, alertRes, revenueRes] = await Promise.all([
        api.get('/admin/analytics/users'),
        api.get('/admin/analytics/alerts?days=7'),
        api.get('/admin/revenue'),
      ])
      setUserAnalytics(userRes.data.data)
      setAlertAnalytics(alertRes.data.data)
      setRevenue(revenueRes.data.data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
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

  const tabs = [
    { id: 'users' as const, label: 'User Analytics', icon: Users },
    { id: 'alerts' as const, label: 'Alert Analytics', icon: BarChart3 },
    { id: 'revenue' as const, label: 'Revenue', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-400" />
            Analytics
          </h1>
          <p className="text-neutral-400 mt-1">Detailed insights and metrics</p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* User Analytics Tab */}
      {activeTab === 'users' && userAnalytics && (
        <div className="space-y-6">
          {/* Active Users */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <p className="text-sm text-neutral-400 mb-2">Active (Last Week)</p>
              <p className="text-3xl font-bold text-green-400">{userAnalytics.activeUsers.lastWeek}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {((userAnalytics.activeUsers.lastWeek / userAnalytics.activeUsers.total) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-sm text-neutral-400 mb-2">Active (Last Month)</p>
              <p className="text-3xl font-bold text-blue-400">{userAnalytics.activeUsers.lastMonth}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {((userAnalytics.activeUsers.lastMonth / userAnalytics.activeUsers.total) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-sm text-neutral-400 mb-2">Total Users</p>
              <p className="text-3xl font-bold text-neutral-100">{userAnalytics.activeUsers.total}</p>
            </div>
          </div>

          {/* Activity Distribution & Retention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Activity Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: 'Inactive (0 alerts)', value: userAnalytics.activityDistribution.inactive, color: 'bg-neutral-600' },
                  { label: 'Low (1-10 alerts)', value: userAnalytics.activityDistribution.low, color: 'bg-yellow-500' },
                  { label: 'Medium (11-50)', value: userAnalytics.activityDistribution.medium, color: 'bg-blue-500' },
                  { label: 'High (51-200)', value: userAnalytics.activityDistribution.high, color: 'bg-green-500' },
                  { label: 'Very High (200+)', value: userAnalytics.activityDistribution.veryHigh, color: 'bg-purple-500' },
                ].map((item) => {
                  const total = Object.values(userAnalytics.activityDistribution).reduce((a, b) => a + b, 0)
                  const percent = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-neutral-300 flex-1">{item.label}</span>
                      <span className="text-sm font-medium text-neutral-100">{item.value}</span>
                      <span className="text-xs text-neutral-500 w-12 text-right">{percent.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Weekly Retention</h3>
              <div className="space-y-3">
                {userAnalytics.retention.map((week) => (
                  <div key={week.week} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-400 w-20">Week {week.week}</span>
                    <div className="flex-1 h-6 bg-neutral-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-600 to-teal-400"
                        style={{ width: `${week.rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-100 w-12 text-right">{week.rate}%</span>
                    <span className="text-xs text-neutral-500">({week.retained}/{week.total})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Popularity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Popular Coins</h3>
              <div className="space-y-2">
                {userAnalytics.coinPopularity.slice(0, 10).map((coin, idx) => (
                  <div key={coin.symbol} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500 w-6">{idx + 1}</span>
                    <span className="text-sm font-medium text-neutral-100 w-16">{coin.symbol}</span>
                    <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(coin.userCount / userAnalytics.coinPopularity[0].userCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-400">{coin.userCount} users</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Popular Exchanges</h3>
              <div className="space-y-2">
                {userAnalytics.exchangePopularity.map((ex, idx) => (
                  <div key={ex.exchangeId} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500 w-6">{idx + 1}</span>
                    <span className="text-sm font-medium text-neutral-100 w-20 capitalize">{ex.exchangeId}</span>
                    <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(ex.userCount / userAnalytics.exchangePopularity[0].userCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-400">{ex.userCount} users</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Analytics Tab */}
      {activeTab === 'alerts' && alertAnalytics && (
        <div className="space-y-6">
          {/* Daily Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Daily Alert Summary (7 days)</h3>
            <div className="h-64 flex items-end gap-2">
              {alertAnalytics.dailySummary.map((day) => {
                const maxCount = Math.max(...alertAnalytics.dailySummary.map(d => d.count), 1)
                const height = (day.count / maxCount) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-neutral-400">{day.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t transition-all duration-300"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${day.date}: ${day.count} alerts, avg ${day.avgSpread.toFixed(2)}%`}
                    />
                    <span className="text-xs text-neutral-500">{day.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spread Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Spread Distribution</h3>
            <div className="grid grid-cols-5 gap-4">
              {alertAnalytics.spreadDistribution.map((bucket) => {
                const total = alertAnalytics.spreadDistribution.reduce((sum, b) => sum + b.count, 0)
                const percent = total > 0 ? (bucket.count / total) * 100 : 0
                return (
                  <div key={bucket.label} className="text-center">
                    <div className="h-32 flex items-end justify-center mb-2">
                      <div
                        className="w-full max-w-16 bg-purple-500 rounded-t"
                        style={{ height: `${percent}%`, minHeight: '4px' }}
                      />
                    </div>
                    <p className="text-lg font-bold text-neutral-100">{bucket.count}</p>
                    <p className="text-xs text-neutral-400">{bucket.label}</p>
                    <p className="text-xs text-neutral-500">{percent.toFixed(1)}%</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Hour */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">Alerts by Hour (UTC)</h3>
            <div className="h-40 flex items-end gap-1">
              {Array.from({ length: 24 }, (_, hour) => {
                const data = alertAnalytics.byHour.find(h => h.hour === hour)
                const count = data?.count || 0
                const maxCount = Math.max(...alertAnalytics.byHour.map(h => h.count), 1)
                const height = (count / maxCount) * 100
                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center"
                    title={`${hour}:00 - ${count} alerts`}
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition-colors"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    {hour % 4 === 0 && (
                      <span className="text-[10px] text-neutral-500 mt-1">{hour}h</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Symbols & Exchange Pairs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Top Symbols by Alerts</h3>
              <div className="space-y-2">
                {alertAnalytics.bySymbol.slice(0, 10).map((item, idx) => (
                  <div key={item.symbol} className="flex items-center justify-between p-2 bg-neutral-800/50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500 w-6">{idx + 1}</span>
                      <span className="font-medium text-neutral-100">{item.symbol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-neutral-100">{item.count}</span>
                      <span className="text-xs text-neutral-400 ml-2">avg {item.avgSpread.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">Top Exchange Routes</h3>
              <div className="space-y-2">
                {alertAnalytics.byExchangePair.slice(0, 10).map((item, idx) => (
                  <div key={item.pair} className="flex items-center justify-between p-2 bg-neutral-800/50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500 w-6">{idx + 1}</span>
                      <span className="font-medium text-neutral-100 text-sm">{item.pair}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-neutral-100">{item.count}</span>
                      <span className="text-xs text-neutral-400 ml-2">avg {item.avgSpread.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenue && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card p-6 bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30">
              <p className="text-sm text-neutral-400 mb-2">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-green-400">${revenue.mrr.toLocaleString()}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-neutral-400 mb-2">Annual Run Rate</p>
              <p className="text-3xl font-bold text-neutral-100">${revenue.arr.toLocaleString()}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-neutral-400 mb-2">New Paid (This Month)</p>
              <p className="text-3xl font-bold text-blue-400">{revenue.newPaidUsersThisMonth}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-neutral-400 mb-2">Avg Revenue/User</p>
              <p className="text-3xl font-bold text-purple-400">${revenue.avgRevenuePerPaidUser}</p>
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-6">Subscription Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-3 text-sm font-medium text-neutral-400">Plan</th>
                    <th className="text-right py-3 text-sm font-medium text-neutral-400">Users</th>
                    <th className="text-right py-3 text-sm font-medium text-neutral-400">% of Total</th>
                    <th className="text-right py-3 text-sm font-medium text-neutral-400">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.subscriptionBreakdown.map((sub) => (
                    <tr key={sub.plan} className="border-b border-neutral-800">
                      <td className="py-4 font-medium text-neutral-100 capitalize">{sub.plan}</td>
                      <td className="py-4 text-right text-neutral-300">{sub.count}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-neutral-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-teal-500"
                              style={{ width: `${sub.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-neutral-400 w-12">{sub.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-4 text-right font-medium text-green-400">
                        ${sub.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

