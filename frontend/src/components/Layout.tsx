import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import {
  LayoutDashboard,
  Coins as CoinsIcon,
  Building2,
  Bell,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Shield,
  Users,
  Server,
  Activity,
  BarChart3,
  Database,
} from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: t('nav.dashboard'), href: '/app/dashboard', icon: LayoutDashboard },
    { name: t('nav.coins'), href: '/app/coins', icon: CoinsIcon },
    { name: t('nav.exchanges'), href: '/app/exchanges', icon: Building2 },
    { name: t('nav.alerts'), href: '/app/alerts', icon: Bell },
    { name: t('nav.settings'), href: '/app/settings', icon: Settings },
    { name: t('nav.subscription'), href: '/app/subscription', icon: CreditCard },
    { name: t('nav.profile') || 'Profile', href: '/app/profile', icon: UserIcon },
  ]

  // Admin navigation (only visible to admins)
  const adminNavigation = [
    { name: 'Overview', href: '/app/admin', icon: Shield },
    { name: 'Monitoring', href: '/app/admin/monitoring', icon: Activity },
    { name: 'Analytics', href: '/app/admin/analytics', icon: BarChart3 },
    { name: 'Users', href: '/app/admin/users', icon: Users },
    { name: 'Exchanges', href: '/app/admin/exchanges', icon: Building2 },
    { name: 'Symbols', href: '/app/admin/symbols', icon: Database },
    { name: 'System', href: '/app/admin/system', icon: Server },
  ]

  const isAdmin = (user as any)?.role === 'admin'

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
        <div className={`fixed inset-y-0 left-0 flex w-72 flex-col bg-neutral-800/95 backdrop-blur-xl border-r border-neutral-700/50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SidebarContent
            navigation={navigation}
            adminNavigation={adminNavigation}
            isAdmin={isAdmin}
            isActive={isActive}
            user={user}
            logout={logout}
            t={t}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col bg-neutral-800/95 backdrop-blur-xl border-r border-neutral-700/50">
        <SidebarContent
          navigation={navigation}
          adminNavigation={adminNavigation}
          isAdmin={isAdmin}
          isActive={isActive}
          user={user}
          logout={logout}
          t={t}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-700/50 bg-neutral-800/95 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-neutral-300 hover:text-neutral-100 lg:hidden transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6 flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">
                CryptoSpreadBot
              </h1>
            </div>
            <div className="flex items-center gap-x-3 sm:gap-x-4">
              <div className="text-sm hidden sm:block">
                <span className="font-semibold text-neutral-100">
                  {user?.first_name || user?.username || 'User'}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-lg bg-teal-700/50 text-teal-300 text-xs font-medium">
                  {user?.plan.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 sm:py-8 lg:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  navigation,
  adminNavigation,
  isAdmin,
  isActive,
  user,
  logout,
  t,
  onClose,
}: any) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-neutral-700/50">
        <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">
          CryptoSpreadBot
        </h2>
        {isAdmin && (
          <span className="ml-2 px-2 py-0.5 rounded bg-red-900/50 text-red-300 text-xs font-medium">
            Admin
          </span>
        )}
      </div>
      <nav className="flex flex-1 flex-col px-3 py-4 gap-y-1 overflow-y-auto">
        <ul className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item: any) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-600/30'
                      : 'text-neutral-300 hover:bg-neutral-700/50 hover:text-teal-400'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive(item.href) ? '' : 'group-hover:text-teal-400'}`} />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <li className="mt-4 pt-4 border-t border-neutral-700/50">
                <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Admin
                </p>
              </li>
              {adminNavigation.map((item: any) => {
                const Icon = item.icon
                const active = isActive(item.href) || (item.href === '/admin' && location.pathname === '/admin')
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={`group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30'
                          : 'text-neutral-300 hover:bg-neutral-700/50 hover:text-red-400'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? '' : 'group-hover:text-red-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </>
          )}
        </ul>
        <div className="mt-auto border-t border-neutral-700/50 pt-4">
          <button
            onClick={logout}
            className="group flex w-full gap-x-3 rounded-xl p-3 text-sm font-medium text-neutral-300 hover:bg-neutral-700/50 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}



