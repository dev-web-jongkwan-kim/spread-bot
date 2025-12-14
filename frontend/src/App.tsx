import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { I18nProvider } from './i18n/I18nContext'
import { ToastProvider } from './contexts/ToastContext'
import { ModalProvider } from './contexts/ModalContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Coins from './pages/Coins'
import Exchanges from './pages/Exchanges'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Subscription from './pages/Subscription'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminSystem from './pages/admin/AdminSystem'
import AdminMonitoring from './pages/admin/AdminMonitoring'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminExchanges from './pages/admin/AdminExchanges'
import AdminSymbols from './pages/admin/AdminSymbols'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <ModalProvider>
            <ToastProvider>
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="coins" element={<ErrorBoundary><Coins /></ErrorBoundary>} />
              <Route path="exchanges" element={<ErrorBoundary><Exchanges /></ErrorBoundary>} />
              <Route path="alerts" element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
              <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="subscription" element={<ErrorBoundary><Subscription /></ErrorBoundary>} />
              <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
              
              {/* Admin Routes */}
              <Route path="admin" element={<AdminRoute><ErrorBoundary><AdminDashboard /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/monitoring" element={<AdminRoute><ErrorBoundary><AdminMonitoring /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/analytics" element={<AdminRoute><ErrorBoundary><AdminAnalytics /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/users" element={<AdminRoute><ErrorBoundary><AdminUsers /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/exchanges" element={<AdminRoute><ErrorBoundary><AdminExchanges /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/symbols" element={<AdminRoute><ErrorBoundary><AdminSymbols /></ErrorBoundary></AdminRoute>} />
              <Route path="admin/system" element={<AdminRoute><ErrorBoundary><AdminSystem /></ErrorBoundary></AdminRoute>} />
            </Route>
          </Routes>
            </ToastProvider>
          </ModalProvider>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App




