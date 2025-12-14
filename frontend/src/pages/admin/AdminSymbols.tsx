import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useModal } from '../../contexts/ModalContext'
import api from '../../services/api'
import { 
  Coins, 
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  Filter,
  Users,
  Bell,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

type SortDirection = 'asc' | 'desc' | null
type SortField = 'symbol' | 'name' | 'isActive' | 'exchangeCount' | 'updatedAt'

interface ExchangeMapping {
  id?: string
  exchangeId: string
  exchangeSymbol: string
  isActive: boolean
}

interface SymbolItem {
  id: string
  symbol: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  exchangeMappings: ExchangeMapping[]
  exchangeCount: number
}

interface SymbolDetails extends SymbolItem {
  stats: {
    userCount: number
    alertCount: number
    exchangeCount: number
  }
}

export default function AdminSymbols() {
  const toast = useToast()
  const { showConfirm } = useModal()
  const [symbols, setSymbols] = useState<SymbolItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [syncing, setSyncing] = useState(false)
  
  // Detail modal
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  
  // Sorting (server-side)
  const [sortField, setSortField] = useState<SortField>('symbol')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle: asc -> desc -> asc
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setPage(1) // Reset to first page when sorting changes
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="text-left py-3 px-4 text-sm font-medium text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="w-4">
          {sortField === field && sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
          {sortField === field && sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
    </th>
  )

  const loadSymbols = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        status,
        sortBy: sortField,
        sortOrder: sortDirection?.toUpperCase() || 'ASC',
      })
      if (search) params.append('search', search)
      
      const res = await api.get(`/admin/symbols?${params}`)
      setSymbols(res.data.symbols)
      setPages(res.data.pages)
      setTotal(res.data.total)
    } catch (error) {
      console.error('Failed to load symbols:', error)
      toast.error('Failed to load symbols')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, sortField, sortDirection, toast])

  useEffect(() => {
    loadSymbols()
  }, [loadSymbols])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post('/admin/sync/symbols')
      toast.success('Symbol sync completed')
      await loadSymbols()
    } catch (error) {
      console.error('Failed to sync symbols:', error)
      toast.error('Symbol sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const loadSymbolDetails = async (symbolId: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/symbols/${symbolId}`)
      setSelectedSymbol(res.data.data)
      setEditName(res.data.data.name || '')
      setEditMode(false)
    } catch (error) {
      console.error('Failed to load symbol details:', error)
      toast.error('Failed to load symbol details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleToggleSymbol = async (symbolId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    const confirmed = await showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Symbol`,
      `Are you sure you want to ${action} this symbol?`,
      action === 'deactivate' ? 'warning' : 'info'
    )
    
    if (!confirmed) return

    try {
      await api.put(`/admin/symbols/${symbolId}/toggle`)
      toast.success(`Symbol ${action}d successfully`)
      
      // Update local state
      setSymbols(prev => prev.map(s => 
        s.id === symbolId ? { ...s, isActive: !s.isActive } : s
      ))
      
      if (selectedSymbol?.id === symbolId) {
        setSelectedSymbol(prev => prev ? { ...prev, isActive: !prev.isActive } : null)
      }
    } catch (error) {
      console.error('Failed to toggle symbol:', error)
      toast.error('Failed to update symbol')
    }
  }

  const handleSaveSymbol = async () => {
    if (!selectedSymbol) return

    try {
      await api.put(`/admin/symbols/${selectedSymbol.id}`, { name: editName })
      toast.success('Symbol updated successfully')
      
      setSymbols(prev => prev.map(s => 
        s.id === selectedSymbol.id ? { ...s, name: editName } : s
      ))
      setSelectedSymbol(prev => prev ? { ...prev, name: editName } : null)
      setEditMode(false)
    } catch (error) {
      console.error('Failed to save symbol:', error)
      toast.error('Failed to save symbol')
    }
  }

  const handleToggleExchangeMapping = async (mappingId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/exchange-symbols/${mappingId}`, { isActive: !currentStatus })
      toast.success('Exchange mapping updated')
      
      if (selectedSymbol) {
        setSelectedSymbol(prev => {
          if (!prev) return null
          return {
            ...prev,
            exchangeMappings: prev.exchangeMappings.map(m => 
              m.id === mappingId ? { ...m, isActive: !m.isActive } : m
            ),
          }
        })
      }
    } catch (error) {
      console.error('Failed to toggle exchange mapping:', error)
      toast.error('Failed to update exchange mapping')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-50 flex items-center gap-2">
            <Coins className="h-8 w-8 text-amber-400" />
            Symbol Management
          </h1>
          <p className="text-neutral-400 mt-1">
            Manage synced symbols and exchange mappings ({total} total)
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          {syncing ? (
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

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search symbols..."
                className="input pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as 'all' | 'active' | 'inactive')
                setPage(1)
              }}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Symbol Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400">No symbols found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/50">
                  <SortHeader field="symbol">Symbol</SortHeader>
                  <SortHeader field="name">Name</SortHeader>
                  <SortHeader field="isActive">Status</SortHeader>
                  <SortHeader field="exchangeCount">Exchanges</SortHeader>
                  <SortHeader field="updatedAt">Updated</SortHeader>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((symbol) => (
                  <tr 
                    key={symbol.id} 
                    className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-neutral-100">
                        {symbol.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {symbol.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {symbol.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700/50">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-700/50">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-neutral-300">
                        {symbol.exchangeCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-400">
                      {new Date(symbol.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => loadSymbolDetails(symbol.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-teal-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleSymbol(symbol.id, symbol.isActive)}
                          className={`p-1.5 rounded-lg hover:bg-neutral-700/50 transition-colors ${
                            symbol.isActive 
                              ? 'text-green-400 hover:text-red-400' 
                              : 'text-red-400 hover:text-green-400'
                          }`}
                          title={symbol.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {symbol.isActive ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700">
            <p className="text-sm text-neutral-400">
              Page {page} of {pages} ({total} symbols)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Symbol Detail Modal */}
      {selectedSymbol && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedSymbol.isActive ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                  <Coins className={`h-5 w-5 ${selectedSymbol.isActive ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-100">
                    {selectedSymbol.symbol}
                  </h2>
                  <p className="text-sm text-neutral-400">Symbol Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSymbol(null)}
                className="p-2 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                      <Users className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-neutral-100">
                        {selectedSymbol.stats.userCount}
                      </p>
                      <p className="text-xs text-neutral-400">Users Monitoring</p>
                    </div>
                    <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                      <Bell className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-neutral-100">
                        {selectedSymbol.stats.alertCount}
                      </p>
                      <p className="text-xs text-neutral-400">Total Alerts</p>
                    </div>
                    <div className="p-4 bg-neutral-800/50 rounded-xl text-center">
                      <ArrowUpDown className="h-5 w-5 text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-neutral-100">
                        {selectedSymbol.stats.exchangeCount}
                      </p>
                      <p className="text-xs text-neutral-400">Active Exchanges</p>
                    </div>
                  </div>

                  {/* Name Edit */}
                  <div className="p-4 bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-neutral-300">Display Name</label>
                      {!editMode ? (
                        <button
                          onClick={() => setEditMode(true)}
                          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditMode(false)
                              setEditName(selectedSymbol.name || '')
                            }}
                            className="text-xs text-neutral-400 hover:text-neutral-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveSymbol}
                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                    {editMode ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input w-full"
                        placeholder="Enter display name..."
                      />
                    ) : (
                      <p className="text-neutral-100">{selectedSymbol.name || '-'}</p>
                    )}
                  </div>

                  {/* Exchange Mappings */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 mb-3">Exchange Mappings</h3>
                    <div className="space-y-2">
                      {selectedSymbol.exchangeMappings.length === 0 ? (
                        <p className="text-sm text-neutral-400 text-center py-4">
                          No exchange mappings found
                        </p>
                      ) : (
                        selectedSymbol.exchangeMappings.map((mapping) => (
                          <div
                            key={mapping.id || mapping.exchangeId}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              mapping.isActive 
                                ? 'bg-neutral-800/30 border-neutral-700' 
                                : 'bg-red-900/10 border-red-900/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-neutral-100 capitalize">
                                {mapping.exchangeId}
                              </span>
                              <span className="text-sm text-neutral-400">→</span>
                              <code className="text-sm font-mono text-teal-400 bg-neutral-900/50 px-2 py-0.5 rounded">
                                {mapping.exchangeSymbol}
                              </code>
                            </div>
                            <button
                              onClick={() => mapping.id && handleToggleExchangeMapping(mapping.id, mapping.isActive)}
                              disabled={!mapping.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                mapping.isActive
                                  ? 'text-green-400 hover:text-red-400 hover:bg-red-900/20'
                                  : 'text-red-400 hover:text-green-400 hover:bg-green-900/20'
                              } disabled:opacity-50`}
                            >
                              {mapping.isActive ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl">
                    <div>
                      <p className="font-medium text-neutral-100">Symbol Status</p>
                      <p className="text-sm text-neutral-400">
                        {selectedSymbol.isActive 
                          ? 'Symbol is active and available for users' 
                          : 'Symbol is inactive and hidden from users'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleSymbol(selectedSymbol.id, selectedSymbol.isActive)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedSymbol.isActive
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      }`}
                    >
                      {selectedSymbol.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

