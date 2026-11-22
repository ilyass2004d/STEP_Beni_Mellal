import { useCallback, useState } from 'react';
import { useContent } from './content/store';
import { useLang } from './i18n/LanguageContext';
import { About } from './components/About';
import { After } from './components/After';
import { ChapterRail, type RailItem } from './components/ChapterRail';
import type { SelectionRequest } from './components/explorer/Explorer';
import { ExplorerSection } from './components/explorer/ExplorerSection';
import { Footer } from './components/Footer';
import { Nav } from './components/Nav';
import { chapterAnchor, Narrative } from './components/Narrative';
import { ProcessSection } from './components/sections/ProcessSection';
import { MethodologySection } from './components/sections/MethodologySection';

export default function App() {
  const { content } = useContent();
  const { t } = useLang();
  const [request, setRequest] = useState<SelectionRequest | null>(null);
  // « Voir dans la maquette »: scroll back to the model and select the unit
  const explore = useCallback((id: string) => {
    setRequest({ id, nonce: Date.now() });
    const el = document.getElementById('explorer');
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'auto' : 'smooth' }));
  }, []);

  const chapter = (id: string) => content.chapters.find((c) => c.id === id && c.visible);
  const narrative = ['origine', 'reseau', 'station'].map(chapter).filter((c) => c !== undefined);
  const apres = chapter('apres');

  const rail: RailItem[] = [
    { id: 'explorer', number: '3D', label: t('railModel') },
    ...narrative.map((c) => ({ id: chapterAnchor(c), number: c.number, label: c.eyebrow })),
    { id: 'processus', number: '04', label: t('processEyebrow') },
    { id: 'methodologie', number: '05', label: t('methodEyebrow') },
    ...(apres ? [{ id: 'apres', number: apres.number, label: apres.eyebrow }] : []),
  ];

  return (
    <>
      <a className="skip-link" href="#contenu">
        {t('skip')}
      </a>
      <Nav />
      <main id="contenu">
        <ExplorerSection content={content} request={request} />
        {narrative.length > 0 && <Narrative chapters={narrative} content={content} />}
        <ProcessSection content={content} onExplore={explore} />
        <MethodologySection />
        {apres && <After chapter={apres} content={content} />}
        <About content={content} />
      </main>
      <Footer signature={content.about.signature} />
      <ChapterRail items={rail} />
    </>
  );
}
