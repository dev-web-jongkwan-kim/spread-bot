import { Link } from 'react-router-dom';
import { TrendingUp, Bell, Settings, BarChart3, Shield, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../i18n/I18nContext';

export default function FeaturesPage() {
  const { t } = useI18n();

  const getFeatures = (key: string): string[] => {
    const value = t(key);
    return Array.isArray(value) ? value : [];
  };

  const features = [
    {
      icon: TrendingUp,
      title: t('features.monitoring.title') || 'Multi-Exchange Monitoring',
      description: t('features.monitoring.description') || 'Monitor price spreads across 8 major exchanges simultaneously',
      features: getFeatures('features.monitoring.features'),
      gradient: 'from-ocean-500 to-ocean-700',
    },
    {
      icon: Bell,
      title: t('features.alerts.title') || 'Smart Alert System',
      description: t('features.alerts.description') || 'Get notified only when it matters',
      features: getFeatures('features.alerts.features'),
      gradient: 'from-teal-500 to-teal-700',
    },
    {
      icon: Settings,
      title: t('features.customization.title') || 'Full Customization',
      description: t('features.customization.description') || 'Tailor the bot to your trading strategy',
      features: getFeatures('features.customization.features'),
      gradient: 'from-coral-500 to-coral-700',
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title') || 'Advanced Analytics',
      description: t('features.analytics.description') || 'Track and optimize your trading performance',
      features: getFeatures('features.analytics.features'),
      gradient: 'from-ocean-400 to-ocean-600',
    },
    {
      icon: Shield,
      title: t('features.security.title') || 'Security & Privacy',
      description: t('features.security.description') || 'Your data is safe with us',
      features: getFeatures('features.security.features'),
      gradient: 'from-teal-400 to-teal-600',
    },
    {
      icon: Zap,
      title: t('features.plans.title') || 'Flexible Plans',
      description: t('features.plans.description') || 'Scale as you grow',
      features: getFeatures('features.plans.features'),
      gradient: 'from-coral-400 to-coral-600',
    },
  ];

  return (
    <>
      <SEOHead
        title={t('features.title')}
        description={t('features.subtitle')}
        keywords="crypto monitoring features, arbitrage alerts, trading tools, cryptocurrency analytics, real-time price monitoring"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('features.title')}
            </h1>
            <p className="text-xl text-ocean-200">
              {t('features.subtitle')}
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="card group hover:shadow-soft-2xl transition-all">
                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center mb-6`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">
                      {feature.title}
                    </h2>
                    <p className="text-ocean-300 mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.features.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-teal-400 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-ocean-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Supported Exchanges Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Supported Exchanges
              </h2>
              <p className="text-xl text-ocean-200">
                Monitor prices across 8 major cryptocurrency exchanges
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'KuCoin', 'Gate.io', 'Huobi'].map((exchange) => (
                <div key={exchange} className="card text-center">
                  <span className="text-2xl mb-2">🔄</span>
                  <h3 className="text-lg font-semibold text-white">{exchange}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="card bg-gradient-to-br from-ocean-700 to-ocean-800 border-ocean-600 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {t('landing.cta.title')}
              </h2>
              <p className="text-xl text-ocean-200 mb-10">
                {t('landing.cta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/login" className="btn-primary text-lg px-10 py-4 inline-flex items-center justify-center shadow-soft-lg hover:shadow-soft-2xl">
                  {t('landing.cta.button')}
                  <ArrowRight className="ml-3 w-5 h-5" />
                </Link>
                <Link to="/pricing" className="btn-secondary text-lg px-10 py-4 shadow-soft hover:shadow-soft-lg">
                  {t('nav.pricing')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
