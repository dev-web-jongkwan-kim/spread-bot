import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../i18n/I18nContext';

export default function PricingPage() {
  const { t } = useI18n();

  const getFeatures = (key: string): string[] => {
    const value = t(key);
    return Array.isArray(value) ? value : [];
  };

  const plans = [
    {
      name: t('pricing.free.name') || 'Free',
      price: t('pricing.free.price') || '$0',
      description: t('pricing.free.description') || 'Perfect for getting started',
      features: getFeatures('pricing.free.features'),
      cta: 'Get Started',
      popular: false,
    },
    {
      name: t('pricing.basic.name') || 'Basic',
      price: t('pricing.basic.price') || '$9.99',
      description: t('pricing.basic.description') || 'For casual traders',
      features: getFeatures('pricing.basic.features'),
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: t('pricing.pro.name') || 'Pro',
      price: t('pricing.pro.price') || '$29.99',
      description: t('pricing.pro.description') || 'For serious traders',
      features: getFeatures('pricing.pro.features'),
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: t('pricing.whale.name') || 'Whale',
      price: t('pricing.whale.price') || '$99.99',
      description: t('pricing.whale.description') || 'For professional traders',
      features: getFeatures('pricing.whale.features'),
      cta: 'Start Free Trial',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: t('pricing.faq.q1.question') || 'Can I change my plan later?',
      answer: t('pricing.faq.q1.answer') || 'Yes, you can upgrade or downgrade your plan at any time.',
    },
    {
      question: t('pricing.faq.q2.question') || 'Do you require exchange API keys?',
      answer: t('pricing.faq.q2.answer') || 'No, we only monitor public price data.',
    },
    {
      question: t('pricing.faq.q3.question') || 'How do refunds work?',
      answer: t('pricing.faq.q3.answer') || 'We offer a 7-day money-back guarantee for all paid plans.',
    },
    {
      question: t('pricing.faq.q4.question') || 'What payment methods do you accept?',
      answer: t('pricing.faq.q4.answer') || 'We accept all major credit cards and cryptocurrencies.',
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'CryptoSpreadBot',
    description: 'Real-time cryptocurrency arbitrage alerts',
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.price.replace('$', ''),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price.replace('$', ''),
        priceCurrency: 'USD',
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: '1',
          unitCode: 'MON',
        },
      },
    })),
  };

  return (
    <>
      <SEOHead
        title={t('pricing.title')}
        description={t('pricing.subtitle')}
        keywords="crypto bot pricing, arbitrage alert pricing, trading bot plans, cryptocurrency monitoring cost"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('pricing.title')}
            </h1>
            <p className="text-xl text-ocean-200">
              {t('pricing.subtitle')}
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`card relative ${
                    plan.popular
                      ? 'border-2 border-ocean-400 shadow-soft-2xl'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-ocean-400 to-ocean-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.price !== '$0' && (
                      <span className="text-ocean-400 ml-2">/month</span>
                    )}
                  </div>
                  <p className="text-ocean-300 mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-teal-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-ocean-200">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/login"
                    className={`btn-${
                      plan.popular ? 'primary' : 'secondary'
                    } w-full text-center inline-block`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Money-back guarantee */}
            <div className="text-center mt-12">
              <p className="text-ocean-300">
                All paid plans come with a{' '}
                <span className="text-teal-400 font-semibold">
                  7-day money-back guarantee
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Compare Plans
              </h2>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ocean-700">
                    <th className="text-left py-4 px-4 text-white font-semibold">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 text-white font-semibold">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 text-white font-semibold">
                      Basic
                    </th>
                    <th className="text-center py-4 px-4 text-white font-semibold">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 text-white font-semibold">
                      Whale
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-ocean-700">
                    <td className="py-4 px-4 text-ocean-200">Max Coins</td>
                    <td className="text-center py-4 px-4 text-ocean-300">3</td>
                    <td className="text-center py-4 px-4 text-ocean-300">10</td>
                    <td className="text-center py-4 px-4 text-ocean-300">50</td>
                    <td className="text-center py-4 px-4 text-teal-400">
                      Unlimited
                    </td>
                  </tr>
                  <tr className="border-b border-ocean-700">
                    <td className="py-4 px-4 text-ocean-200">Max Exchanges</td>
                    <td className="text-center py-4 px-4 text-ocean-300">3</td>
                    <td className="text-center py-4 px-4 text-ocean-300">5</td>
                    <td className="text-center py-4 px-4 text-teal-400">8</td>
                    <td className="text-center py-4 px-4 text-teal-400">8</td>
                  </tr>
                  <tr className="border-b border-ocean-700">
                    <td className="py-4 px-4 text-ocean-200">Daily Alerts</td>
                    <td className="text-center py-4 px-4 text-ocean-300">10</td>
                    <td className="text-center py-4 px-4 text-ocean-300">50</td>
                    <td className="text-center py-4 px-4 text-ocean-300">200</td>
                    <td className="text-center py-4 px-4 text-teal-400">
                      Unlimited
                    </td>
                  </tr>
                  <tr className="border-b border-ocean-700">
                    <td className="py-4 px-4 text-ocean-200">
                      Custom Threshold
                    </td>
                    <td className="text-center py-4 px-4">-</td>
                    <td className="text-center py-4 px-4">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    </td>
                    <td className="text-center py-4 px-4">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    </td>
                    <td className="text-center py-4 px-4">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-ocean-700">
                    <td className="py-4 px-4 text-ocean-200">
                      Advanced Analytics
                    </td>
                    <td className="text-center py-4 px-4">-</td>
                    <td className="text-center py-4 px-4">-</td>
                    <td className="text-center py-4 px-4">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    </td>
                    <td className="text-center py-4 px-4">
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-ocean-200">Support</td>
                    <td className="text-center py-4 px-4 text-ocean-300">
                      Email
                    </td>
                    <td className="text-center py-4 px-4 text-ocean-300">
                      Priority
                    </td>
                    <td className="text-center py-4 px-4 text-ocean-300">
                      Priority
                    </td>
                    <td className="text-center py-4 px-4 text-teal-400">
                      Dedicated
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                {t('pricing.faq.title')}
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="card">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-ocean-300">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Trading Smarter?
            </h2>
            <p className="text-xl text-ocean-200 mb-8">
              Start with our free plan, no credit card required
            </p>
            <Link
              to="/login"
              className="btn-primary text-lg px-8 py-4 inline-flex items-center"
            >
              Get Started for Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
