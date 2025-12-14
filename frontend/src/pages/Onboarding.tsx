import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, ArrowRight, ArrowLeft, TrendingUp, Bell, Settings, Coins } from 'lucide-react'

export default function Onboarding() {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: 'Welcome to CryptoSpreadBot',
      description: 'Get real-time arbitrage opportunities across multiple exchanges',
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            CryptoSpreadBot monitors price differences across major cryptocurrency exchanges 
            and alerts you when profitable trading opportunities are detected.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-300">
            <li>Real-time price monitoring</li>
            <li>Instant Telegram alerts</li>
            <li>Multi-exchange support</li>
            <li>Customizable thresholds</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Select Your Coins',
      description: 'Choose which cryptocurrencies to monitor',
      icon: Coins,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Navigate to the <strong className="text-primary-400">Coins</strong> page to add cryptocurrencies you want to monitor.
          </p>
          <div className="bg-ocean-800 p-4 rounded-lg">
            <p className="text-sm text-neutral-400 mb-2">💡 Tip:</p>
            <p className="text-sm text-neutral-300">
              Start with popular coins like BTC, ETH, or USDT. You can add more coins later as you explore.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Configure Exchanges',
      description: 'Select the exchanges you use for trading',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Go to the <strong className="text-primary-400">Exchanges</strong> page and enable the exchanges where you have accounts.
          </p>
          <div className="bg-ocean-800 p-4 rounded-lg">
            <p className="text-sm text-neutral-400 mb-2">💡 Tip:</p>
            <p className="text-sm text-neutral-300">
              Enable at least 2 exchanges to see arbitrage opportunities. More exchanges = more opportunities!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Set Alert Thresholds',
      description: 'Configure when you want to be notified',
      icon: Bell,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Set your spread threshold in <strong className="text-primary-400">Settings</strong>. 
            You'll receive alerts when the price difference exceeds your threshold.
          </p>
          <div className="bg-ocean-800 p-4 rounded-lg">
            <p className="text-sm text-neutral-400 mb-2">💡 Recommended:</p>
            <p className="text-sm text-neutral-300">
              Start with a 2-3% threshold. Lower thresholds = more alerts, higher thresholds = fewer but more profitable opportunities.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'You\'re All Set!',
      description: 'Start monitoring and get alerts',
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Your dashboard will show real-time price comparisons and recent alerts. 
            When an opportunity is detected, you'll receive a Telegram notification.
          </p>
          <div className="bg-primary-500/20 border border-primary-500/50 p-4 rounded-lg">
            <p className="text-sm text-primary-300 font-semibold mb-2">🚀 Next Steps:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-neutral-300">
              <li>Add your first coin</li>
              <li>Enable your exchanges</li>
              <li>Set your threshold</li>
              <li>Wait for alerts!</li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/dashboard')
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const Step = steps[currentStep]
  const Icon = Step.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl shadow-soft-lg p-8 md:p-12">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
              >
                Skip
              </button>
            </div>
            <div className="w-full bg-ocean-700 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/20 mb-4">
              <Icon className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-primary-400 mb-3">
              {Step.title}
            </h1>
            <p className="text-lg text-neutral-400 mb-6">
              {Step.description}
            </p>
          </div>

          <div className="mb-8 min-h-[200px]">
            {Step.content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-ocean-700 text-neutral-300 hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary-500'
                      : 'bg-ocean-700 hover:bg-ocean-600'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

