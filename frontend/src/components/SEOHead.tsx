import { Helmet } from 'react-helmet-async';
import { useI18n } from '../i18n/I18nContext';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  structuredData?: object;
}

export default function SEOHead({
  title,
  description,
  keywords,
  image = '/og-image.png',
  url,
  type = 'website',
  structuredData,
}: SEOHeadProps) {
  const { language } = useI18n();

  const siteTitle = 'CryptoSpreadBot';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDescription =
    'Real-time cryptocurrency arbitrage alerts across 8 major exchanges. Monitor price spreads and maximize your trading opportunities.';
  const finalDescription = description || defaultDescription;
  const defaultKeywords =
    'cryptocurrency, arbitrage, trading, price alerts, crypto spreads, exchanges, bitcoin, ethereum, binance, coinbase';
  const finalKeywords = keywords || defaultKeywords;
  const siteUrl = url || 'https://cryptospreadbot.com';
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <html lang={language} />
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content={language} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={finalDescription} />
      <meta property="twitter:image" content={imageUrl} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
