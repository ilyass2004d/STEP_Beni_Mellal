import type { Chapter, SiteContent } from '../content/types';
import { Icon } from './Icon';
import { KindBadge, Picture } from './media/Picture';
import { useLang } from '../i18n/LanguageContext';

/** Chapter 05 — the purpose of treatment, with the documented destination of the treated water. */
export function After({ chapter, content }: { chapter: Chapter; content: SiteContent }) {
  const { t } = useLang();
  const source = content.sources.find((s) => s.id === chapter.secondarySource);
  return (
    <section id="apres" className="after" data-tone="dark" aria-labelledby="apres-title">
      <div className="after__grid">
        {chapter.media && (
          <figure className="after__media">
            <Picture media={chapter.media} sizes="(min-width: 900px) 55vw, 100vw" />
            <figcaption>
              <KindBadge kind={chapter.media.kind} /> {chapter.media.caption}
            </figcaption>
          </figure>
        )}
        <div className="after__text">
          <p className="eyebrow">
            <span className="chapter__num">{chapter.number}</span> {chapter.eyebrow}
          </p>
          <h2 id="apres-title" className="section-title">
            {chapter.title}
          </h2>
          <p className="after__quote">« {chapter.text} »</p>
          {chapter.secondary && (
            <p className="after__fact">
              {chapter.secondary}
              {source && <cite>{t('sourcePrefix')} {source.label}</cite>}
            </p>
          )}
          <div className="after__actions">
            <a className="btn btn--primary" href="#explorer">
              {t('exploreAgain')} <Icon name="cube" />
            </a>
            <a className="btn btn--ghost-light" href="#parcours">
              {t('backToStart')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
