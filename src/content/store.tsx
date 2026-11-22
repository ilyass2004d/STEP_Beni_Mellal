import { createContext, useContext, useMemo, type ReactNode } from 'react';
import fr from './content.fr.json';
import en from './content.en.json';
import type { SiteContent } from './types';
import { useLang } from '../i18n/LanguageContext';

/**
 * Editorial content, one file per language (src/content/content.fr.json / content.en.json).
 * Edit both files, keeping the same ids, then rebuild.
 */
const CONTENT = { fr: fr as unknown as SiteContent, en: en as unknown as SiteContent };

const ContentContext = createContext<{ content: SiteContent } | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const value = useMemo(() => ({ content: CONTENT[lang] }), [lang]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside <ContentProvider>');
  return ctx;
}

export function sortedVisibleComponents(content: SiteContent) {
  return content.components.filter((c) => c.visible).sort((a, b) => a.order - b.order);
}
