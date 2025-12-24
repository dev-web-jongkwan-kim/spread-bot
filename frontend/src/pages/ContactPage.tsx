import { useState } from 'react';
import { Mail, Send, MessageSquare, Clock } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../contexts/ToastContext';

export default function ContactPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast(t('contact.form.success'), 'success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      showToast(t('contact.form.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title={t('contact.title')}
        description={t('contact.subtitle')}
        keywords="contact cryptospreadbot, crypto bot support, customer service, help desk"
      />

      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900">
        <PublicHeader />

        {/* Hero Section */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('contact.title')}
            </h1>
            <p className="text-xl text-ocean-200">
              {t('contact.subtitle')}
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="card">
              <h2 className="text-2xl font-bold text-white mb-6">
                Send us a message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-ocean-200 mb-2"
                  >
                    {t('contact.form.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-ocean-800 border border-ocean-700 rounded-lg text-white placeholder-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-ocean-200 mb-2"
                  >
                    {t('contact.form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-ocean-800 border border-ocean-700 rounded-lg text-white placeholder-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-ocean-200 mb-2"
                  >
                    {t('contact.form.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-ocean-800 border border-ocean-700 rounded-lg text-white placeholder-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-ocean-200 mb-2"
                  >
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-ocean-800 border border-ocean-700 rounded-lg text-white placeholder-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full inline-flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Send className="w-5 h-5 mr-2 animate-pulse" />
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {t('contact.form.send')}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Get in Touch */}
              <div className="card">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {t('contact.info.title')}
                </h3>
                <div className="space-y-3 text-ocean-300">
                  <div>
                    <span className="text-ocean-400 font-semibold">Email:</span>{' '}
                    <a
                      href={`mailto:${t('contact.info.email')}`}
                      className="text-teal-400 hover:text-teal-300"
                    >
                      {t('contact.info.email')}
                    </a>
                  </div>
                  <div>
                    <span className="text-ocean-400 font-semibold">
                      Telegram:
                    </span>{' '}
                    <a
                      href={`https://t.me/${t('contact.info.telegram').replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:text-teal-300"
                    >
                      {t('contact.info.telegram')}
                    </a>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 mr-2 mt-0.5 text-ocean-400" />
                    <span>{t('contact.info.hours')}</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="card">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('contact.support.title')}
                </h3>
                <p className="text-ocean-300 mb-4">
                  {t('contact.support.description')}
                </p>
                <a href="/faq" className="text-teal-400 hover:text-teal-300">
                  {t('contact.support.link')} →
                </a>
              </div>

              {/* Sales */}
              <div className="card">
                <div className="w-12 h-12 bg-ocean-600 rounded-lg flex items-center justify-center mb-4">
                  <Send className="w-6 h-6 text-ocean-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('contact.sales.title')}
                </h3>
                <p className="text-ocean-300 mb-4">
                  {t('contact.sales.description')}
                </p>
                <a
                  href={`mailto:${t('contact.info.email')}`}
                  className="text-teal-400 hover:text-teal-300"
                >
                  {t('contact.sales.link')} →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Map/Additional Info Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-ocean-800/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              We're Here to Help
            </h2>
            <p className="text-ocean-300 text-lg">
              Our team is committed to providing the best support for all your
              cryptocurrency arbitrage trading needs.
            </p>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
