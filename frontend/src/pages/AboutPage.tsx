import { Link } from 'react-router-dom';
import { Target, Eye, Shield, Zap, Users, ArrowRight, TrendingUp } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../i18n/I18nContext';

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <>
      <SEOHead
        title={t('about.title')}
        description={t('about.subtitle')}
        keywords="about cryptospreadbot, crypto arbitrage platform, trading tools, cryptocurrency monitoring"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('about.title')}
            </h1>
            <p className="text-xl text-ocean-200">
              {t('about.subtitle')}
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12">
            <div className="card">
              <div className="w-16 h-16 bg-ocean-600 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-ocean-200" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                {t('about.mission.title')}
              </h2>
              <p className="text-ocean-300 text-lg leading-relaxed">
                {t('about.mission.description')}
              </p>
            </div>

            <div className="card">
              <div className="w-16 h-16 bg-ocean-600 rounded-lg flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-ocean-200" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                {t('about.vision.title')}
              </h2>
              <p className="text-ocean-300 text-lg leading-relaxed">
                {t('about.vision.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('about.values.title')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('about.values.reliability.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('about.values.reliability.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('about.values.speed.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('about.values.speed.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('about.values.transparency.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('about.values.transparency.description')}
                </p>
              </div>

              <div className="card group hover:shadow-soft-2xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('about.values.innovation.title')}
                </h3>
                <p className="text-ocean-300">
                  {t('about.values.innovation.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="w-16 h-16 bg-ocean-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Users className="w-8 h-8 text-ocean-200" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('about.team.title')}
              </h2>
              <p className="text-ocean-300 text-lg leading-relaxed">
                {t('about.team.description')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-4xl mx-auto text-center">
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
              <Link to="/contact" className="btn-secondary text-lg px-10 py-4 shadow-soft hover:shadow-soft-lg">
                {t('nav.contact')}
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
