import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Menu, X, Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useState } from 'react';

export default function PublicHeader() {
  const { t, language, setLanguage } = useI18n();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const navigation = [
    { name: t('nav.about'), href: '/about' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.pricing'), href: '/pricing' },
    { name: t('nav.faq'), href: '/faq' },
    { name: t('nav.contact'), href: '/contact' },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ocean-900/95 backdrop-blur-xl border-b border-ocean-700/50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-ocean-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-soft">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-ocean-200 bg-clip-text text-transparent">
              CryptoSpreadBot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-ocean-700/50 text-teal-400 shadow-soft'
                    : 'text-ocean-200 hover:text-white hover:bg-ocean-800/50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-ocean-200 hover:text-white hover:bg-ocean-800/50 transition-all"
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {languages.find(lang => lang.code === language)?.name || language}
                </span>
              </button>
              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-ocean-800/95 backdrop-blur-xl border border-ocean-700/50 rounded-xl shadow-soft-2xl overflow-hidden z-20">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          language === lang.code
                            ? 'bg-ocean-700/50 text-teal-400 font-medium'
                            : 'text-ocean-200 hover:bg-ocean-700/30 hover:text-white'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-ocean-200 hover:text-white transition-colors"
            >
              {t('nav.signIn')}
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-ocean-500 hover:from-teal-400 hover:to-ocean-400 text-white font-medium rounded-xl shadow-soft hover:shadow-soft-lg transition-all"
            >
              {t('nav.getStarted')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-ocean-200 hover:text-white hover:bg-ocean-800/50 transition-all"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-ocean-700/50 bg-ocean-900/98 backdrop-blur-xl">
          <div className="px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-ocean-700/50 text-teal-400 shadow-soft'
                    : 'text-ocean-200 hover:text-white hover:bg-ocean-800/50'
                }`}
              >
                {item.name}
              </Link>
            ))}

            <div className="pt-4 border-t border-ocean-700/50 mt-4 space-y-1">
              {/* Language options for mobile */}
              <div className="px-4 py-2 text-xs font-semibold text-ocean-400 uppercase tracking-wider">
                {t('settings.language')}
              </div>
              <div className="flex flex-wrap gap-2 px-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      language === lang.code
                        ? 'bg-ocean-700/50 text-teal-400'
                        : 'bg-ocean-800/50 text-ocean-200 hover:text-white'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-ocean-200 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-all text-base font-medium"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 bg-gradient-to-r from-teal-500 to-ocean-500 text-white font-medium rounded-xl text-center shadow-soft"
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
