import { useLang } from './i18n/LanguageContext';

export function NotFound() {
  const { t } = useLang();
  return (
    <main className="not-found" data-tone="dark">
      <p className="eyebrow">404</p>
      <h1 className="section-title">
        {t('notFound')}
      </h1>
      <a className="btn btn--primary" href={import.meta.env.BASE_URL}>
        {t('backHome')}
      </a>
    </main>
  );
}
