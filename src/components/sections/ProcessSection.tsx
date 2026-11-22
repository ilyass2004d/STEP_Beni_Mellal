import { useState } from 'react';
import type { SiteContent } from '../../content/types';
import { sortedVisibleComponents } from '../../content/store';
import { useLang } from '../../i18n/LanguageContext';
import { allStages, sideFlows, stageById, supervision, waterLine, type ProcessStage } from '../../data/process';
import { Locator } from '../Locator';
import { Icon } from '../Icon';

/**
 * Chapter 04 — the treatment line in a compact, readable diagram.
 * Selecting a stage shows its units on the key plan; « Voir dans la maquette »
 * selects the unit in the 3D model.
 */
export function ProcessSection({ content, onExplore }: { content: SiteContent; onExplore(id: string): void }) {
  const { t, tr } = useLang();
  const [activeId, setActiveId] = useState(waterLine[0].id);
  const components = sortedVisibleComponents(content);
  const byId = new Map(components.map((c) => [c.id, c]));
  const linked = new Set(allStages.flatMap((s) => s.units));
  const others = components.filter((c) => !linked.has(c.id));
  const active = stageById[activeId];

  const unitNames = (s: ProcessStage) => s.units.map((id) => byId.get(id)?.shortName ?? byId.get(id)?.name).filter(Boolean).join(', ');

  return (
    <section id="processus" className="process-section" data-tone="light" aria-labelledby="processus-title">
      <header className="section-head">
        <p className="eyebrow">
          <span className="chapter__num">04</span> {t('processEyebrow')}
        </p>
        <h2 id="processus-title" className="section-title">
          {t('processTitleA')} <em>{t('processTitleB')}</em>
        </h2>
        <p className="section-lead">{t('processLead')}</p>
      </header>

      <div className="process">
        <div className="flow">
          <p className="label flow__lane">{t('waterLine')}</p>
          <ol className="psteps">
            {waterLine.map((s, i) => (
              <li key={s.id} className={`pstep ${activeId === s.id ? 'is-active' : ''}`}>
                <button type="button" className="pstep__btn" aria-pressed={activeId === s.id} onClick={() => setActiveId(s.id)}>
                  <span className="pstep__num" aria-hidden="true">{i + 1}</span>
                  <span className="pstep__body">
                    <span className="pstep__name">{tr(s.name)}</span>
                    <span className="pstep__desc">{tr(s.description)}</span>
                    <span className="pstep__units">{unitNames(s)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <p className="label flow__lane flow__lane--side">{t('inParallel')}</p>
          <ul className="side">
            {[...sideFlows, supervision].map((s) => (
              <li key={s.id}>
                <button type="button" className={`side__btn ${activeId === s.id ? 'is-active' : ''}`} aria-pressed={activeId === s.id} onClick={() => setActiveId(s.id)}>
                  <span className="side__name">{tr(s.name)}</span>
                  <span className="side__desc">{tr(s.description)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="process__focus" aria-live="polite">
          <p className="label">
            {waterLine.includes(active) && <span className="process__step">{waterLine.indexOf(active) + 1}</span>}
            {tr(active.name)}
          </p>
          <Locator ids={active.units} allIds={components.map((c) => c.id)} label={tr(active.name)} />
          <ul className="process__units">
            {active.units.map((id) => {
              const c = byId.get(id);
              if (!c) return null;
              return (
                <li key={id}>
                  <span>{c.name}</span>
                  <button type="button" className="link-btn" onClick={() => onExplore(id)}>
                    {t('seeInModel')} <Icon name="cube" />
                  </button>
                </li>
              );
            })}
          </ul>
          {others.length > 0 && (
            <p className="process__others">
              {t('notInProcess')}{' '}
              {others.map((c, i) => (
                <button key={c.id} type="button" className="link-quiet" onClick={() => onExplore(c.id)}>
                  {c.name}
                  {i < others.length - 1 ? ',' : ''}
                </button>
              ))}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
