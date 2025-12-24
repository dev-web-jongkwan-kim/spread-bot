import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Settings, BarChart3, Clock } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../i18n/I18nContext';

export default function LandingPage() {
  const { t } = useI18n();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CryptoSpreadBot',
    description: 'Real-time cryptocurrency arbitrage alerts across 8 major exchanges',
    applicationCategory: 'FinanceApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  return (
    <>
      <SEOHead
        title={t('landing.hero.title')}
        description={t('landing.hero.subtitle')}
        keywords="cryptocurrency, arbitrage, trading, crypto alerts, price monitoring, telegram bot, binance, coinbase, kraken"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-10 leading-tight px-4" style={{ letterSpacing: '-0.02em' }}>
              {t('landing.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-ocean-200 mb-14 max-w-3xl mx-auto px-4" style={{ lineHeight: '1.8', letterSpacing: '0.01em' }}>
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center px-4">
              <Link
                to="/login"
                className="btn-primary text-lg px-10 py-4 inline-flex items-center justify-center shadow-soft-lg hover:shadow-soft-2xl"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary text-lg px-10 py-4 inline-flex items-center justify-center shadow-soft hover:shadow-soft-lg"
              >
                {t('landing.hero.watchDemo')}
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-24 px-4">
              <div className="card">
                <div className="text-3xl font-bold text-ocean-400 mb-2">8</div>
                <div className="text-ocean-300">{t('landing.stats.exchanges')}</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-ocean-400 mb-2">200+</div>
                <div className="text-ocean-300">{t('landing.stats.symbols')}</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-ocean-400 mb-2">24/7</div>
                <div className="text-ocean-300">{t('landing.stats.alerts')}</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-ocean-400 mb-2">10K+</div>
                <div className="text-ocean-300">{t('landing.stats.users')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('landing.features.title')}
              </h2>
              <p className="text-xl text-ocean-200">
                {t('landing.features.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-ocean-500 transition-colors">
                  <Clock className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('landing.features.realtime.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('landing.features.realtime.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-ocean-500 transition-colors">
                  <Bell className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('landing.features.instant.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('landing.features.instant.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-ocean-500 transition-colors">
                  <Settings className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('landing.features.customizable.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('landing.features.customizable.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-ocean-500 transition-colors">
                  <BarChart3 className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('landing.features.analytics.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('landing.features.analytics.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Improved with consistent card heights */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
                {t('landing.howItWorks.title')}
              </h2>
              <p className="text-xl text-ocean-200 max-w-2xl mx-auto" style={{ lineHeight: '1.8' }}>
                Get started in minutes with our simple 4-step process
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="card h-full flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-2xl shadow-soft-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ lineHeight: '1.4' }}>
                  {t('landing.howItWorks.step1.title')}
                </h3>
                <p className="text-ocean-200 text-base flex-grow" style={{ lineHeight: '1.8' }}>
                  {t('landing.howItWorks.step1.description')}
                </p>
              </div>

              <div className="card h-full flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-2xl shadow-soft-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ lineHeight: '1.4' }}>
                  {t('landing.howItWorks.step2.title')}
                </h3>
                <p className="text-ocean-200 text-base flex-grow" style={{ lineHeight: '1.8' }}>
                  {t('landing.howItWorks.step2.description')}
                </p>
              </div>

              <div className="card h-full flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-2xl shadow-soft-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ lineHeight: '1.4' }}>
                  {t('landing.howItWorks.step3.title')}
                </h3>
                <p className="text-ocean-200 text-base flex-grow" style={{ lineHeight: '1.8' }}>
                  {t('landing.howItWorks.step3.description')}
                </p>
              </div>

              <div className="card h-full flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-ocean-500 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-2xl shadow-soft-lg">
                  4
                </div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ lineHeight: '1.4' }}>
                  {t('landing.howItWorks.step4.title')}
                </h3>
                <p className="text-ocean-200 text-base flex-grow" style={{ lineHeight: '1.8' }}>
                  {t('landing.howItWorks.step4.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-ocean-200 mb-8">
              {t('landing.pricing.subtitle')}
            </p>
            <Link to="/pricing" className="btn-primary inline-flex items-center">
              {t('landing.pricing.viewAllPlans')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="card bg-gradient-to-br from-ocean-700 to-ocean-800 border-ocean-600">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('landing.cta.title')}
              </h2>
              <p className="text-xl text-ocean-200 mb-8">
                {t('landing.cta.subtitle')}
              </p>
              <Link
                to="/login"
                className="btn-primary text-lg px-8 py-4 inline-flex items-center"
              >
                {t('landing.cta.button')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
