import { useLang } from '../i18n/LanguageContext';
import { author } from '../data/author';

export function Footer({ signature }: { signature: string }) {
  const { t } = useLang();
  return (
    <footer className="footer" data-tone="dark">
      <div className="footer__inner">
        <p className="footer__brand">
          STEP <em>Béni Mellal</em>
        </p>
        <p className="footer__sign">{signature}</p>
        <p className="footer__roles">
          {author.signature.join(', ')}
        </p>
        <p className="footer__note">
          {t('footerNote')} © 2026 {author.name}
        </p>
        <a className="footer__top" href="#explorer">
          {t('top')}
        </a>
      </div>
    </footer>
  );
}
