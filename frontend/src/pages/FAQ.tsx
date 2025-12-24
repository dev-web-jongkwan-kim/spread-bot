import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import SEOHead from '../components/SEOHead'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'

interface FAQItem {
  question: string
  answer: string
  category: string
}

export default function FAQ() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs: FAQItem[] = [
    {
      category: 'General',
      question: 'What is CryptoSpreadBot?',
      answer: 'CryptoSpreadBot is a real-time cryptocurrency arbitrage opportunity monitoring service. It tracks price differences across multiple exchanges and alerts you when profitable trading opportunities are detected.',
    },
    {
      category: 'General',
      question: 'How does arbitrage work?',
      answer: 'Arbitrage involves buying a cryptocurrency on one exchange where the price is lower and selling it on another exchange where the price is higher, profiting from the price difference. CryptoSpreadBot identifies these opportunities in real-time.',
    },
    {
      category: 'Features',
      question: 'Which exchanges are supported?',
      answer: 'We support major exchanges including Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Gate.io, and Huobi. You can enable the exchanges where you have accounts.',
    },
    {
      category: 'Features',
      question: 'How do I receive alerts?',
      answer: 'Alerts are sent via Telegram. When you sign up, you authenticate with your Telegram account, and we send notifications directly to your Telegram when arbitrage opportunities are detected.',
    },
    {
      category: 'Features',
      question: 'What is a spread threshold?',
      answer: 'The spread threshold is the minimum price difference percentage that triggers an alert. For example, a 2% threshold means you\'ll only receive alerts when the price difference between exchanges is at least 2%.',
    },
    {
      category: 'Features',
      question: 'How often are prices updated?',
      answer: 'Prices are monitored and updated every 10 seconds in real-time. This ensures you get the most current arbitrage opportunities as soon as they appear.',
    },
    {
      category: 'Usage',
      question: 'Can I customize which coins to monitor?',
      answer: 'Yes! You can add or remove coins from your monitoring list on the Coins page. You can also set individual thresholds for each coin.',
    },
    {
      category: 'Usage',
      question: 'What happens if I miss an opportunity?',
      answer: 'Cryptocurrency prices change rapidly. If you miss an opportunity, don\'t worry - new opportunities appear constantly. The dashboard shows recent alerts so you can track patterns.',
    },
    {
      category: 'Billing',
      question: 'Is there a free plan?',
      answer: 'Yes, we offer a free plan with limited features. Paid plans (Basic, Pro, Whale) offer more coins, exchanges, and daily alerts. Check the Subscription page for details.',
    },
    {
      category: 'Billing',
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription at any time from the Subscription page. Your access will continue until the end of your current billing period.',
    },
    {
      category: 'Security',
      question: 'Is my data secure?',
      answer: 'Yes, we take data security seriously. We use encryption, secure authentication, and follow best practices. See our Privacy Policy for more details.',
    },
    {
      category: 'Security',
      question: 'Can I export my data?',
      answer: 'Yes, you can export all your data including alerts, settings, and preferences. This is available in your account settings as part of GDPR compliance.',
    },
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <>
      <SEOHead
        title="FAQ - Frequently Asked Questions | CryptoSpreadBot"
        description="Find answers to common questions about CryptoSpreadBot, cryptocurrency arbitrage trading, and our services"
        keywords="crypto faq, arbitrage questions, trading help, crypto bot support"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl mb-8 shadow-soft-lg">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-ocean-200">
              Find answers to common questions about CryptoSpreadBot
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="card-no-padding overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-ocean-700/30 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                        {faq.category}
                      </div>
                      <span className="font-semibold text-lg text-white">
                        {faq.question}
                      </span>
                    </div>
                    {openIndex === index ? (
                      <ChevronUp className="w-6 h-6 text-teal-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-ocean-400 flex-shrink-0" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="px-6 pb-6 pt-2 border-t border-ocean-700/50">
                      <p className="text-ocean-200 leading-relaxed text-base">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Contact CTA */}
            <div className="mt-12 card bg-gradient-to-br from-teal-600/20 to-ocean-600/20 border-teal-500/30 text-center">
              <HelpCircle className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">
                Still have questions?
              </h3>
              <p className="text-ocean-200 mb-6 max-w-2xl mx-auto">
                Can't find what you're looking for? Our support team is here to help you get started with CryptoSpreadBot.
              </p>
              <a
                href="/contact"
                className="btn-primary inline-flex items-center justify-center px-8 py-3"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  )
}

