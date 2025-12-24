import { useI18n } from '../i18n/I18nContext'
import SEOHead from '../components/SEOHead'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import { FileText } from 'lucide-react'

export default function Terms() {
  const { t } = useI18n()

  return (
    <>
      <SEOHead
        title="Terms of Service | CryptoSpreadBot"
        description="Read the terms and conditions for using CryptoSpreadBot arbitrage alert service"
        keywords="terms of service, terms and conditions, crypto bot, legal"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl mb-8 shadow-soft-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-ocean-200">
              Last updated: December 2025
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="card">

          <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using CryptoSpreadBot, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">2. Service Description</h2>
              <p>
                CryptoSpreadBot provides real-time cryptocurrency arbitrage opportunity alerts across multiple exchanges. 
                Our service monitors price differences and notifies users when profitable trading opportunities are detected.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You agree not to use the service for any illegal or unauthorized purpose</li>
                <li>You are solely responsible for your trading decisions and any resulting financial losses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">4. Disclaimer of Warranties</h2>
              <p>
                The service is provided "as is" without warranties of any kind, either express or implied. 
                We do not guarantee the accuracy, completeness, or timeliness of price data or alerts. 
                Cryptocurrency trading involves substantial risk of loss.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">5. Limitation of Liability</h2>
              <p>
                CryptoSpreadBot shall not be liable for any indirect, incidental, special, consequential, or punitive damages, 
                including without limitation, loss of profits, data, use, goodwill, or other intangible losses, 
                resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">6. Subscription and Payment</h2>
              <p>
                Subscription fees are charged in advance on a monthly or yearly basis. 
                All fees are non-refundable except as required by law. 
                We reserve the right to change our pricing at any time with 30 days notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">7. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice, 
                for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. 
                We will notify users of any material changes via email or through the service. 
                Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">9. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us through the support channels provided in the application.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-ocean-700 text-sm text-neutral-400">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
            </div>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  )
}

