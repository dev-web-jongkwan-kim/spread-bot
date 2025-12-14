import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { useModal } from '../contexts/ModalContext'
import api from '../services/api'
import { logger } from '../services/logger'
import {
  User as UserIcon,
  Mail,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const { showConfirm } = useModal()
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    logger.userAction('view_profile')
  }, [])

  const handleCancelSubscription = async () => {
    const confirmed = await showConfirm(
      t('profile.cancelConfirm') || 'Are you sure you want to cancel your subscription?',
      t('profile.cancelSubscription') || 'Cancel Subscription'
    )
    if (!confirmed) {
      return
    }

    setCancelling(true)
    try {
      logger.userAction('cancel_subscription_attempt', { plan: user?.plan })
      
      await api.post('/subscription/cancel')
      
      toast.success(t('profile.cancelSuccess') || 'Subscription cancelled successfully')
      logger.userAction('cancel_subscription_success', { plan: user?.plan })
      
      await refreshUser()
    } catch (error: any) {
      logger.error('Failed to cancel subscription', error instanceof Error ? error : new Error(String(error)), {
        plan: user?.plan,
      })
      toast.error(error.response?.data?.detail || t('profile.cancelError') || 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-50 mb-2">
          {t('profile.title') || 'Profile'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('profile.description') || 'Manage your account information'}
        </p>
      </div>

      {/* User Info Card */}
      <div className="card p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 mb-1">
              {user.first_name || user.username || 'User'}
            </h2>
            <p className="text-sm text-neutral-400">@{user.username || 'username'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400 mb-1">{t('profile.telegramId') || 'Telegram ID'}</p>
              <p className="text-sm font-medium text-neutral-100">{user.telegram_id}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400 mb-1">{t('profile.memberSince') || 'Member Since'}</p>
              <p className="text-sm font-medium text-neutral-100">
                {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400 mb-1">{t('profile.currentPlan') || 'Current Plan'}</p>
              <p className="text-sm font-medium text-teal-400">{user.plan.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400 mb-1">{t('profile.dailyAlerts') || 'Daily Alerts'}</p>
              <p className="text-sm font-medium text-neutral-100">
                {user.daily_alerts_sent || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      {user.plan !== 'free' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-100 mb-4">
            {t('profile.subscriptionManagement') || 'Subscription Management'}
          </h2>
          
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200 mb-1">
                  {t('profile.cancelWarning') || 'Cancel Subscription'}
                </p>
                <p className="text-xs text-amber-300">
                  {t('profile.cancelWarningDesc') || 'Cancelling will downgrade your account to Free plan. You will lose access to premium features.'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCancelSubscription}
            disabled={cancelling}
            className="btn-secondary text-red-400 hover:bg-red-900/20 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('profile.cancelling') || 'Cancelling...'}
              </>
            ) : (
              t('profile.cancelSubscription') || 'Cancel Subscription'
            )}
          </button>
        </div>
      )}

      {/* Account Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-teal-400 mb-1">
            {user.coins?.length || 0}
          </p>
          <p className="text-xs sm:text-sm text-neutral-400">
            {t('profile.monitoredCoins') || 'Monitored Coins'}
          </p>
        </div>

        <div className="card p-4 sm:p-6 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-teal-500 mb-1">
            {user.exchanges?.length || 0}
          </p>
          <p className="text-xs sm:text-sm text-neutral-400">
            {t('profile.selectedExchanges') || 'Selected Exchanges'}
          </p>
        </div>

        <div className="card p-4 sm:p-6 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-teal-400 mb-1">
            {user.daily_alerts_sent || 0}
          </p>
          <p className="text-xs sm:text-sm text-neutral-400">
            {t('profile.totalAlerts') || 'Total Alerts Sent'}
          </p>
        </div>
      </div>
    </div>
  )
}


