import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

export default function FAQ() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs: FAQItem[] = [
    {
      question: 'What is CryptoSpreadBot?',
      answer: 'CryptoSpreadBot is a real-time cryptocurrency arbitrage opportunity monitoring service. It tracks price differences across multiple exchanges and alerts you when profitable trading opportunities are detected.',
    },
    {
      question: 'How does arbitrage work?',
      answer: 'Arbitrage involves buying a cryptocurrency on one exchange where the price is lower and selling it on another exchange where the price is higher, profiting from the price difference. CryptoSpreadBot identifies these opportunities in real-time.',
    },
    {
      question: 'Which exchanges are supported?',
      answer: 'We support major exchanges including Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Gate.io, and Huobi. You can enable the exchanges where you have accounts.',
    },
    {
      question: 'How do I receive alerts?',
      answer: 'Alerts are sent via Telegram. When you sign up, you authenticate with your Telegram account, and we send notifications directly to your Telegram when arbitrage opportunities are detected.',
    },
    {
      question: 'What is a spread threshold?',
      answer: 'The spread threshold is the minimum price difference percentage that triggers an alert. For example, a 2% threshold means you\'ll only receive alerts when the price difference between exchanges is at least 2%.',
    },
    {
      question: 'How often are prices updated?',
      answer: 'Prices are monitored and updated every 10 seconds in real-time. This ensures you get the most current arbitrage opportunities as soon as they appear.',
    },
    {
      question: 'Can I customize which coins to monitor?',
      answer: 'Yes! You can add or remove coins from your monitoring list on the Coins page. You can also set individual thresholds for each coin.',
    },
    {
      question: 'What happens if I miss an opportunity?',
      answer: 'Cryptocurrency prices change rapidly. If you miss an opportunity, don\'t worry - new opportunities appear constantly. The dashboard shows recent alerts so you can track patterns.',
    },
    {
      question: 'Is there a free plan?',
      answer: 'Yes, we offer a free plan with limited features. Paid plans (Basic, Pro, Whale) offer more coins, exchanges, and daily alerts. Check the Subscription page for details.',
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription at any time from the Subscription page. Your access will continue until the end of your current billing period.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we take data security seriously. We use encryption, secure authentication, and follow best practices. See our Privacy Policy for more details.',
    },
    {
      question: 'Can I export my data?',
      answer: 'Yes, you can export all your data including alerts, settings, and preferences. This is available in your account settings as part of GDPR compliance.',
    },
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl shadow-soft-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-primary-400 mb-4">
            {t('faq.title') || 'Frequently Asked Questions'}
          </h1>
          <p className="text-neutral-400 mb-8">
            {t('faq.description') || 'Find answers to common questions about CryptoSpreadBot'}
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-ocean-800 rounded-lg border border-ocean-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-ocean-700 transition-colors"
                >
                  <span className="font-semibold text-neutral-200 pr-4">
                    {faq.question}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 py-4 border-t border-ocean-700">
                    <p className="text-neutral-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <p className="text-primary-300 font-semibold mb-2">
              Still have questions?
            </p>
            <p className="text-neutral-300 text-sm">
              If you can't find the answer you're looking for, please contact us through the support channels in the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

