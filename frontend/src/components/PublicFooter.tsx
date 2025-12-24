import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer className="bg-ocean-950 border-t border-ocean-700/50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-ocean-500 rounded-xl flex items-center justify-center shadow-soft">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CryptoSpreadBot</span>
            </div>
            <p className="text-ocean-400 text-sm leading-relaxed">
              {t('landing.hero.subtitle').substring(0, 100)}...
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/features" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  {t('nav.features')}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  {t('nav.pricing')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  {t('nav.faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-ocean-400 hover:text-teal-400 text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-ocean-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-ocean-500 text-sm">
              © {new Date().getFullYear()} CryptoSpreadBot. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-ocean-500 hover:text-teal-400 text-sm transition-colors">
                Twitter
              </a>
              <a href="#" className="text-ocean-500 hover:text-teal-400 text-sm transition-colors">
                Telegram
              </a>
              <a href="#" className="text-ocean-500 hover:text-teal-400 text-sm transition-colors">
                Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
