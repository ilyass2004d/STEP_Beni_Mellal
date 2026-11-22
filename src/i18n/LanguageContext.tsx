import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { UI, type Lang, type UIKey } from './ui';

interface LangValue {
  lang: Lang;
  setLang(l: Lang): void;
  t(key: UIKey): string;
  /** picks the current language in a { fr, en } object */
  tr<T>(v: { fr: T; en: T }): T;
}

const Ctx = createContext<LangValue | null>(null);
const KEY = 'stepbm.lang';

function initial(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'fr' || s === 'en') return s;
  } catch {
    /* storage unavailable */
  }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);
  const t = useCallback((k: UIKey) => UI[lang][k] ?? UI.fr[k], [lang]);
  const tr = useCallback(<T,>(v: { fr: T; en: T }) => v[lang], [lang]);
  const value = useMemo(() => ({ lang, setLang, t, tr }), [lang, t, tr]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside <LanguageProvider>');
  return v;
}
