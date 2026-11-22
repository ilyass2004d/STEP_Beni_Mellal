import type { ReactNode } from 'react';
import type { MediaRef, SiteContent, StepComponent } from '../content/types';
import { withBase } from '../content/media';
import { Gallery } from './media/Gallery';
import { Locator } from './Locator';
import { useLang } from '../i18n/LanguageContext';
import { footprintOf } from '../utils/geometry';

export function componentMedia(c: StepComponent): MediaRef[] {
  return [...c.photos, c.render, c.diagram].filter((m): m is MediaRef => Boolean(m?.src));
}

interface Props {
  component: StepComponent;
  content: SiteContent;
  headingLevel?: 2 | 3;
  onClose?(): void;
  actions?: ReactNode;
}

/** Editorial fact sheet for one structure. Only fields that hold information are rendered. */
export function InfoPanel({ component: c, content, headingLevel = 2, onClose, actions }: Props) {
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const S = `h${headingLevel + 1}` as 'h3' | 'h4';
  const stage = content.stages.find((s) => s.id === c.stage);
  const sources = c.sources.map((id) => content.sources.find((s) => s.id === id)).filter(Boolean);
  const media = componentMedia(c);
  const sourceLabel = (id?: string) => content.sources.find((s) => s.id === id)?.label;
  const { t } = useLang();
  const shortSource = (id: string) =>
    ({ 'rapport-visite': t('src_rapport'), synoptique: t('src_synoptique'), 'photos-visite': t('src_photos'), maquette: t('src_maquette'), 'plan-sig': t('src_sig') })[id] ?? id;

  return (
    <article className="info-panel" aria-labelledby={`info-${c.id}`}>
      <header className="info-panel__head">
        <p className="label">
          <span className="info-panel__code">{c.code}</span> {stage?.label ?? t('structure')}
        </p>
        <H id={`info-${c.id}`} className="info-panel__title">
          {c.name}
        </H>
        {c.technicalName && <p className="info-panel__tech">{c.technicalName}</p>}
        {onClose && (
          <button type="button" className="icon-btn info-panel__close" onClick={onClose} aria-label={t('closeSheet')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </header>

      <p className="info-panel__lead">{c.shortDescription}</p>

      {(c.role || c.details) && (
        <section>
          <S className="label">{t('role')}</S>
          {c.role && <p>{c.role}</p>}
          {c.details && <p>{c.details}</p>}
        </section>
      )}

      {c.components && c.components.length > 0 && (
        <section>
          <S className="label">{t('mainComponents')}</S>
          <ul className="info-panel__components">
            {c.components.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {media.length > 0 && (
        <section>
          <S className="label">{t('visualDoc')}</S>
          <Gallery key={c.id} items={media} />
        </section>
      )}

      {c.video?.src && (
        <section>
          <S className="label">{t('kind_video')}</S>
          <video className="info-panel__video" src={withBase(c.video.src)} controls preload="none" aria-label={c.video.alt} />
        </section>
      )}

      {c.parameters.length > 0 && (
        <section>
          <S className="label">{t('techInfo')}</S>
          <dl className="params">
            {c.parameters.map((p, i) => (
              <div key={`${p.label}-${i}`}>
                <dt>{p.label}</dt>
                <dd>
                  {p.value}
                  {p.source && <small title={sourceLabel(p.source)}>{shortSource(p.source)}</small>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {footprintOf(c.id).length > 0 && (
        <section className="info-panel__where">
          <S className="label">{t('position')}</S>
          <Locator ids={[c.id]} allIds={content.components.map((x) => x.id)} label={`${t('position')} : ${c.name}`} />
        </section>
      )}

      {sources.length > 0 && (
        <section className="info-panel__sources">
          <S className="label">{t('sources')}</S>
          {(
            <ul>
              {sources.map((s) => (
                <li key={s!.id}>
                  {s!.label}
                  {s!.detail && <span>{s!.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {actions && <footer className="info-panel__actions">{actions}</footer>}
    </article>
  );
}
