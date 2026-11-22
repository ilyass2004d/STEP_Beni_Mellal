import { withBase } from '../../content/media';
import { useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { methodology, type MethodStep } from '../../data/methodology';
import { AREA_HA, BOUNDARY_LOCAL, EXTENT, ringsToPath } from '../../utils/geometry';
import { Picture } from '../media/Picture';
import { SatelliteView } from './SatelliteView';

function Boundary() {
  const { lang } = useLang();
  const W = EXTENT.width, H = EXTENT.height;
  const area = lang === 'fr' ? String(AREA_HA).replace('.', ',') : String(AREA_HA);
  return (
    <svg className="bdraw" viewBox={`-90 -70 ${W + 180} ${H + 150}`} role="img" aria-label={`${area} ha`}>
      <g className="bdraw__grid">
        {Array.from({ length: Math.floor(W / 100) + 1 }, (_, i) => <line key={`x${i}`} x1={i * 100} y1={0} x2={i * 100} y2={H} />)}
        {Array.from({ length: Math.floor(H / 100) + 1 }, (_, i) => <line key={`y${i}`} x1={0} y1={i * 100} x2={W} y2={i * 100} />)}
      </g>
      <path className="bdraw__site" d={ringsToPath([BOUNDARY_LOCAL])} />
      <g className="bdraw__dim">
        <line x1={0} y1={-34} x2={W} y2={-34} />
        <line x1={0} y1={-44} x2={0} y2={-24} />
        <line x1={W} y1={-44} x2={W} y2={-24} />
        <text x={W / 2} y={-46} textAnchor="middle">579 m</text>
        <line x1={-34} y1={0} x2={-34} y2={H} />
        <line x1={-44} y1={0} x2={-24} y2={0} />
        <line x1={-44} y1={H} x2={-24} y2={H} />
        <text x={-46} y={H / 2} textAnchor="middle" transform={`rotate(-90 -46 ${H / 2})`}>771 m</text>
      </g>
      <text className="bdraw__area" x={W * 0.3} y={H * 0.32}>{area} ha</text>
      <text className="bdraw__crs" x={0} y={H + 56}>EPSG:26191, Merchich / Nord Maroc</text>
    </svg>
  );
}

function Visual({ step }: { step: MethodStep }) {
  const { t, tr } = useLang();
  const v = step.visual;
  if (v.type === 'boundary') return <Boundary />;
  if (v.type === 'satellite') return <SatelliteView fallback={<Boundary />} />;
  if (v.type === 'placeholder')
    return (
      <div className="picture picture--missing method__placeholder" role="img" aria-label={tr(v.label)}>
        <span>{t('placeholder')}</span>
        <code>{tr(v.label)}</code>
      </div>
    );
  const img = (
    <Picture
      key={v.src}
      media={{ src: v.src, alt: tr(v.alt), kind: v.src.includes('/photos/') ? 'photo' : v.src.includes('/renders/') ? 'rendu' : 'schema' }}
      sizes="(min-width: 900px) 50vw, 100vw"
      className={`method__img ${v.fit === 'contain' ? 'method__img--contain' : ''}`}
    />
  );
  if (!v.zoom) return img;
  return (
    <a className="method__zoom" href={withBase(v.zoom)} target="_blank" rel="noopener noreferrer" aria-label={`${t('enlarge')} : ${tr(v.alt)}`}>
      {img}
      <span className="method__zoom-hint">{t('enlarge')}</span>
    </a>
  );
}

/** Chapter 05 — from the field and GIS work to the 3D model. */
export function MethodologySection() {
  const { t, tr } = useLang();
  const [i, setI] = useState(0);
  const step = methodology[i];
  const groups = [
    { id: 'gis', label: t('groupGis') },
    { id: '3d', label: t('group3d') },
  ] as const;

  return (
    <section id="methodologie" className="method-section" data-tone="light" aria-labelledby="methodologie-title">
      <header className="section-head">
        <p className="eyebrow">
          <span className="chapter__num">05</span> {t('methodEyebrow')}
        </p>
        <h2 id="methodologie-title" className="section-title">
          {t('methodTitleA')} <em>{t('methodTitleB')}</em>
        </h2>
        <p className="section-lead">{t('methodLead')}</p>
      </header>

      <div className="method">
        <div className="method__steps">
          {groups.map((g) => (
            <div key={g.id} className={`method__group method__group--${g.id}`}>
              <p className="label">{g.label}</p>
              <ol>
                {methodology.map((m, k) =>
                  m.group !== g.id ? null : (
                    <li key={m.number}>
                      <button type="button" className={k === i ? 'is-active' : ''} aria-pressed={k === i} aria-controls="method-panel" onClick={() => setI(k)}>
                        <span className="method__num">{m.number}</span>
                        <span className="method__title">{tr(m.title)}</span>
                      </button>
                      {k === i && (
                        <div className="method__inline">
                          <div className="method__visual"><Visual step={m} /></div>
                          <p>{tr(m.text)}</p>
                          {m.contribution && <p className="method__contrib"><span className="label">{t('contribution')}</span>{tr(m.contribution)}</p>}
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ol>
            </div>
          ))}
        </div>

        <article id="method-panel" className="method__panel" aria-live="polite">
          <div className="method__visual" key={step.number}>
            <Visual step={step} />
          </div>
          <div className="method__body">
            <p className="label">
              {t('step')} {step.number}, {step.group === 'gis' ? t('groupGis') : t('group3d')}
            </p>
            <h3>{tr(step.title)}</h3>
            <p>{tr(step.text)}</p>
            {step.contribution && (
              <p className="method__contrib">
                <span className="label">{t('contribution')}</span>
                {tr(step.contribution)}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
