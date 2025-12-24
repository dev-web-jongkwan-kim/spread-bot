import { useI18n } from '../i18n/I18nContext'
import SEOHead from '../components/SEOHead'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import { Shield } from 'lucide-react'

export default function Privacy() {
  const { t } = useI18n()

  return (
    <>
      <SEOHead
        title="Privacy Policy | CryptoSpreadBot"
        description="Learn how CryptoSpreadBot collects, uses, and protects your personal information"
        keywords="privacy policy, data protection, cryptocurrency, crypto bot"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl mb-8 shadow-soft-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Privacy Policy
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
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">1. Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Telegram ID, username, and profile information</li>
                <li><strong>Usage Data:</strong> Your selected coins, exchanges, alert preferences, and interaction with the service</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and access logs</li>
                <li><strong>Subscription Data:</strong> Payment information processed through third-party payment providers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our service</li>
                <li>Send you arbitrage opportunity alerts</li>
                <li>Process payments and manage subscriptions</li>
                <li>Improve our service and develop new features</li>
                <li>Monitor and analyze usage patterns</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">3. Data Storage and Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data. 
                Your data is stored on secure servers with encryption at rest and in transit. 
                However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">4. Data Sharing</h2>
              <p>We do not sell your personal data. We may share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>With service providers who assist in operating our service (under strict confidentiality agreements)</li>
                <li>In case of a business transfer or merger</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">5. Your Rights (GDPR)</h2>
              <p>If you are located in the EEA, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured format</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
              </ul>
              <p className="mt-4">
                You can exercise these rights by contacting us through the application or by using the data management features in your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">6. Data Retention</h2>
              <p>
                We retain your personal data for as long as necessary to provide our services and comply with legal obligations. 
                When you delete your account, we will delete or anonymize your personal data within 30 days, 
                except where we are required to retain it for legal or regulatory purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">7. Cookies and Tracking</h2>
              <p>
                We use essential cookies to maintain your session and provide core functionality. 
                We do not use third-party tracking cookies or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">8. Third-Party Services</h2>
              <p>
                Our service integrates with Telegram for authentication and payment processors for subscriptions. 
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">9. Children's Privacy</h2>
              <p>
                Our service is not intended for users under the age of 18. 
                We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">10. Changes to Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. 
                We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-primary-300 mb-4">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or wish to exercise your rights, 
                please contact us through the support channels provided in the application.
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

