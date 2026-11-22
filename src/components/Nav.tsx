import { useEffect, useRef, useState } from 'react';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { useLang } from '../i18n/LanguageContext';
import type { UIKey } from '../i18n/ui';

const LINKS: { href: string; key: UIKey }[] = [
  { href: '#explorer', key: 'navExplorer' },
  { href: '#parcours', key: 'navParcours' },
  { href: '#processus', key: 'navProcess' },
  { href: '#methodologie', key: 'navMethod' },
  { href: '#apropos', key: 'navAbout' },
];

/** Discreet over dark/cinematic sections, solid over light ones (detected from data-tone). */
export function Nav() {
  const { t, lang, setLang } = useLang();
  const links = LINKS;
  const { active } = useScrollSpy(links.map((l) => l.href.slice(1)), 0.35);
  const [tone, setTone] = useState<'dark' | 'light'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 40);
      const probe = document.elementsFromPoint(window.innerWidth / 2, 32).find((el) => el.closest('[data-tone]') && !el.closest('.nav'));
      const t = probe?.closest<HTMLElement>('[data-tone]')?.dataset.tone;
      setTone(t === 'light' ? 'light' : 'dark');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    // a section can change tone without scrolling (end of the satellite arrival)
    const mo = new MutationObserver(onScroll);
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-tone'] });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('no-scroll');
    menuRef.current?.querySelector('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`nav nav--${tone} ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <a className="nav__brand" href="#explorer" aria-label={t('homeAria')}>
        <svg className="nav__mark" viewBox="132 82 248 348" aria-hidden="true" focusable="false">
          <clipPath id="nav-drop">
            <path d="M256 82C256 82 132 222 132 306a124 124 0 0 0 248 0C380 222 256 82 256 82Z" />
          </clipPath>
          <path className="nav__mark-raw" d="M256 82C256 82 132 222 132 306a124 124 0 0 0 248 0C380 222 256 82 256 82Z" />
          <path className="nav__mark-clear" d="M100 318C150 292 202 292 256 318S362 344 412 318V460H100Z" clipPath="url(#nav-drop)" />
        </svg>
        <span>
          STEP <em>Béni Mellal</em>
        </span>
      </a>
      <nav aria-label="Navigation" className="nav__links">
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} aria-current={active === l.href.slice(1) ? 'true' : undefined}>
                {t(l.key)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* one button: it shows the current language; a click switches to the other one */}
      <button
        type="button"
        className="lang-switch"
        aria-label={lang === 'fr' ? 'Langue : français. Passer en anglais' : 'Language: English. Switch to French'}
        title={lang === 'fr' ? 'English' : 'Français'}
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      >
        {lang.toUpperCase()}
      </button>
      <button
        ref={buttonRef}
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{open ? t('close') : t('menu')}</span>
        <i aria-hidden="true" />
      </button>
      <div id="nav-menu" ref={menuRef} className="nav__menu" hidden={!open}>
        <ol>
          {links.map((l, i) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                {t(l.key)}
              </a>
            </li>
          ))}
        </ol>
        <p className="nav__menu-sign">{t('menuSign')}</p>
      </div>
    </header>
  );
}
