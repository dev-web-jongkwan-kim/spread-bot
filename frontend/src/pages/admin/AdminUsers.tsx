import { useEffect, useState, useMemo } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  Users, 
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Shield,
  Loader2,
  Eye,
  Edit2,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null
type UserSortField = 'firstName' | 'plan' | 'role' | 'coinsCount' | 'exchangesCount' | 'alertsCount' | 'createdAt'

interface UserItem {
  id: string
  telegramId: number
  username: string | null
  firstName: string | null
  lastName: string | null
  plan: string
  role: string
  coinsCount: number
  exchangesCount: number
  alertsCount: number
  dailyAlertsSent: number
  createdAt: string
  lastActive: string
}

interface UserDetails {
  id: string
  telegramId: number
  username: string | null
  firstName: string | null
  lastName: string | null
  language: string
  plan: string
  role: string
  threshold: number
  isMuted: boolean
  dailyAlertsSent: number
  coins: { symbol: string; isActive: boolean; threshold: number | null }[]
  exchanges: { exchangeId: string; isActive: boolean }[]
  recentAlerts: any[]
  stats: {
    totalAlerts: number
    activeCoins: number
    activeExchanges: number
  }
  createdAt: string
  updatedAt: string
}

export default function AdminUsers() {
  const { t } = useI18n()
  const toast = useToast()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [editingRole, setEditingRole] = useState(false)
  
  // Sorting
  const [sortField, setSortField] = useState<UserSortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedUsers = useMemo(() => {
    if (!sortDirection) return users
    
    return [...users].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'firstName':
          aVal = (a.firstName || a.username || '').toLowerCase()
          bVal = (b.firstName || b.username || '').toLowerCase()
          break
        case 'plan':
          const planOrder = { free: 0, basic: 1, pro: 2, whale: 3 }
          aVal = planOrder[a.plan as keyof typeof planOrder] || 0
          bVal = planOrder[b.plan as keyof typeof planOrder] || 0
          break
        case 'role':
          aVal = a.role === 'admin' ? 1 : 0
          bVal = b.role === 'admin' ? 1 : 0
          break
        case 'coinsCount':
          aVal = a.coinsCount
          bVal = b.coinsCount
          break
        case 'exchangesCount':
          aVal = a.exchangesCount
          bVal = b.exchangesCount
          break
        case 'alertsCount':
          aVal = a.alertsCount
          bVal = b.alertsCount
          break
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [users, sortField, sortDirection])

  const SortHeader = ({ field, children, align = 'left' }: { field: UserSortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => (
    <th 
      className={`py-4 px-4 text-sm font-medium text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors select-none ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
        {children}
        <span className="w-4">
          {sortField === field && sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
          {sortField === field && sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
    </th>
  )

  useEffect(() => {
    loadUsers()
  }, [page, planFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('search', search)
      if (planFilter) params.append('plan', planFilter)

      const response = await api.get(`/admin/users?${params}`)
      setUsers(response.data.users)
      setTotalPages(response.data.pages)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadUsers()
  }

  const loadUserDetails = async (userId: string) => {
    try {
      setDetailsLoading(true)
      const response = await api.get(`/admin/users/${userId}`)
      setSelectedUser(response.data.data)
    } catch (error) {
      console.error('Failed to load user details:', error)
      toast.error('Failed to load user details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const updateUserPlan = async (plan: string) => {
    if (!selectedUser) return
    try {
      await api.put(`/admin/users/${selectedUser.id}/plan`, { plan })
      toast.success('Plan updated successfully')
      setEditingPlan(false)
      loadUserDetails(selectedUser.id)
      loadUsers()
    } catch (error) {
      console.error('Failed to update plan:', error)
      toast.error('Failed to update plan')
    }
  }

  const updateUserRole = async (role: string) => {
    if (!selectedUser) return
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role })
      toast.success('Role updated successfully')
      setEditingRole(false)
      loadUserDetails(selectedUser.id)
      loadUsers()
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role')
    }
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-neutral-700 text-neutral-300',
      basic: 'bg-blue-900/50 text-blue-300',
      pro: 'bg-purple-900/50 text-purple-300',
      whale: 'bg-amber-900/50 text-amber-300',
    }
    return colors[plan] || colors.free
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' 
      ? 'bg-red-900/50 text-red-300' 
      : 'bg-neutral-700 text-neutral-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50 flex items-center gap-2">
            <Users className="h-8 w-8 text-teal-400" />
            User Management
          </h1>
          <p className="text-neutral-400 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, name, or Telegram ID..."
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value)
              setPage(1)
            }}
            className="input w-full sm:w-40"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="whale">Whale</option>
          </select>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <SortHeader field="firstName">User</SortHeader>
                    <SortHeader field="plan">Plan</SortHeader>
                    <SortHeader field="role">Role</SortHeader>
                    <SortHeader field="coinsCount" align="center">Coins</SortHeader>
                    <SortHeader field="exchangesCount" align="center">Exchanges</SortHeader>
                    <SortHeader field="alertsCount" align="center">Alerts</SortHeader>
                    <SortHeader field="createdAt">Joined</SortHeader>
                    <th className="text-right py-4 px-4 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-neutral-100">
                            {user.firstName || user.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {user.username ? `@${user.username}` : `ID: ${user.telegramId}`}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadge(user.plan)}`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role === 'admin' && <Shield className="inline h-3 w-3 mr-1" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-neutral-300">{user.coinsCount}</td>
                      <td className="py-4 px-4 text-center text-neutral-300">{user.exchangesCount}</td>
                      <td className="py-4 px-4 text-center text-neutral-300">{user.alertsCount}</td>
                      <td className="py-4 px-4 text-sm text-neutral-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => loadUserDetails(user.id)}
                          className="p-2 text-neutral-400 hover:text-teal-400 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-neutral-700">
              <p className="text-sm text-neutral-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-neutral-800 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-neutral-800 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-100">
                  {selectedUser.firstName || selectedUser.username || 'Anonymous'}
                </h2>
                <p className="text-sm text-neutral-400">
                  {selectedUser.username ? `@${selectedUser.username}` : ''} • ID: {selectedUser.telegramId}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-neutral-400 hover:text-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Plan & Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">Plan</span>
                      <button
                        onClick={() => setEditingPlan(!editingPlan)}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                    {editingPlan ? (
                      <div className="flex gap-2">
                        {['free', 'basic', 'pro', 'whale'].map((p) => (
                          <button
                            key={p}
                            onClick={() => updateUserPlan(p)}
                            className={`px-2 py-1 rounded text-xs ${
                              p === selectedUser.plan
                                ? 'bg-teal-600 text-white'
                                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanBadge(selectedUser.plan)}`}>
                        <Crown className="inline h-4 w-4 mr-1" />
                        {selectedUser.plan}
                      </span>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">Role</span>
                      <button
                        onClick={() => setEditingRole(!editingRole)}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                    {editingRole ? (
                      <div className="flex gap-2">
                        {['user', 'admin'].map((r) => (
                          <button
                            key={r}
                            onClick={() => updateUserRole(r)}
                            className={`px-2 py-1 rounded text-xs ${
                              r === selectedUser.role
                                ? 'bg-teal-600 text-white'
                                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(selectedUser.role)}`}>
                        {selectedUser.role === 'admin' && <Shield className="inline h-4 w-4 mr-1" />}
                        {selectedUser.role}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-neutral-100">{selectedUser.stats.activeCoins}</p>
                    <p className="text-xs text-neutral-400">Active Coins</p>
                  </div>
                  <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-neutral-100">{selectedUser.stats.activeExchanges}</p>
                    <p className="text-xs text-neutral-400">Exchanges</p>
                  </div>
                  <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-neutral-100">{selectedUser.stats.totalAlerts}</p>
                    <p className="text-xs text-neutral-400">Total Alerts</p>
                  </div>
                </div>

                {/* Coins */}
                {selectedUser.coins && selectedUser.coins.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 mb-2">Coins</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.coins.map((coin) => (
                        <span
                          key={coin.symbol}
                          className={`px-2 py-1 rounded text-xs ${
                            coin.isActive
                              ? 'bg-teal-900/50 text-teal-300'
                              : 'bg-neutral-700 text-neutral-400'
                          }`}
                        >
                          {coin.symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exchanges */}
                {selectedUser.exchanges && selectedUser.exchanges.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 mb-2">Exchanges</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.exchanges.map((ex) => (
                        <span
                          key={ex.exchangeId}
                          className={`px-2 py-1 rounded text-xs ${
                            ex.isActive
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-neutral-700 text-neutral-400'
                          }`}
                        >
                          {ex.exchangeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-400">Language:</span>
                    <span className="ml-2 text-neutral-100">{selectedUser.language}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Threshold:</span>
                    <span className="ml-2 text-neutral-100">{selectedUser.threshold}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Joined:</span>
                    <span className="ml-2 text-neutral-100">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Daily Alerts:</span>
                    <span className="ml-2 text-neutral-100">{selectedUser.dailyAlertsSent}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

