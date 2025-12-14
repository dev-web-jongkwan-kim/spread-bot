import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { logger } from '../services/logger'
import api from '../services/api'
import { Check, Loader2 } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['1 coin', '3 exchanges', '5 alerts/day'],
    current: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 5,
    priceYearly: 40,
    features: ['5 coins', '5 exchanges', 'Unlimited alerts', 'Alert history'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15,
    priceYearly: 120,
    features: [
      'Unlimited coins',
      '10 exchanges',
      'Priority alerts',
      'Custom threshold',
      'Alert history',
    ],
    popular: true,
  },
  {
    id: 'whale',
    name: 'Whale',
    price: 50,
    priceYearly: 400,
    features: [
      'Everything in Pro',
      'All exchanges',
      'API access',
      'VIP support group',
      'Custom alerts',
    ],
  },
]

export default function Subscription() {
  const { user } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    logger.userAction('view_subscription_page')
  }, [])

  const handleUpgrade = async (planId: string) => {
    try {
      setLoading(planId)
      logger.userAction('create_checkout', { plan: planId, yearly })
      const response = await api.post('/subscription/checkout', {
        plan: planId,
        yearly,
      })
      if (response.data.url) {
        logger.userAction('checkout_created', { plan: planId, yearly })
        window.location.href = response.data.url
      } else {
        toast.error(t('subscription.checkoutError') || 'Failed to create checkout')
      }
    } catch (error: any) {
      logger.error('Failed to create checkout', error instanceof Error ? error : new Error(String(error)), { plan: planId, yearly })
      toast.error(error.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-2">
          {t('subscription.title')}
        </h1>
        <p className="text-sm sm:text-base text-neutral-300">
          {t('subscription.description')}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="mb-8 flex justify-center">
        <div className="card p-1 inline-flex gap-1">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              !yearly
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                : 'text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {t('subscription.monthly')}
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              yearly
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                : 'text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {t('subscription.yearly')}
            <span className="ml-1.5 text-xs bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded-full font-semibold">
              {t('subscription.save')} 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {PLANS.map((plan) => {
          const isCurrent = user?.plan === plan.id
          const price = yearly ? plan.priceYearly : plan.price
          const displayPrice = price ? `$${price}` : t('subscription.free')

          return (
            <div
              key={plan.id}
              className={`card p-6 sm:p-8 relative transition-all duration-300 ${
                plan.popular
                  ? 'ring-2 ring-teal-500 shadow-xl shadow-teal-500/20 scale-105'
                  : ''
              } ${isCurrent ? 'bg-gradient-to-br from-teal-900/30 to-teal-800/20 border-2 border-teal-500/50' : 'hover:shadow-soft-lg hover:-translate-y-1'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    {t('subscription.popular')}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                    {t('subscription.current')}
                  </span>
                </div>
              )}

              <h3 className="text-2xl sm:text-3xl font-bold text-neutral-100 mb-2">
                {plan.name}
              </h3>
              <div className="mb-6">
                <span className="text-4xl sm:text-5xl font-bold text-neutral-100">
                  {displayPrice}
                </span>
                {price > 0 && (
                  <span className="text-neutral-400 text-sm sm:text-base ml-1">
                    /{yearly ? t('subscription.perYear') : t('subscription.perMonth')}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-neutral-200">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full px-4 py-3 bg-neutral-700 text-neutral-400 rounded-xl cursor-not-allowed font-medium"
                >
                  {t('subscription.current')}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:shadow-xl hover:shadow-teal-500/40'
                      : 'bg-gradient-to-r from-neutral-700 to-neutral-800 text-white hover:shadow-xl hover:shadow-neutral-900/30'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : plan.id === 'free' ? (
                    t('subscription.downgrade')
                  ) : (
                    t('subscription.upgradeBtn')
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
