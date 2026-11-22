import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { SiteContent } from '../../content/types';
import { useLang } from '../../i18n/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Picture } from '../media/Picture';
import type { SelectionRequest, Status } from './Explorer';

const Explorer = lazy(() => import('./Explorer'));
// MapLibre is only downloaded for the arrival / geographic context.
const GeoArrival = lazy(() => import('../map/GeoArrival'));

/** Small screens / data saver wait for a tap before downloading the model. */
function shouldAskFirst() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData) || window.matchMedia('(max-width: 760px)').matches;
}

/**
 * Opening of the site: the satellite arrival plays over the 3D model, then
 * cross-fades into it. The model loads behind the map during the arrival.
 */
export function ExplorerSection({ content, request }: { content: SiteContent; request: SelectionRequest | null }) {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [askFirst] = useState(shouldAskFirst);
  const [accepted, setAccepted] = useState(false);
  const [modelStatus, setModelStatus] = useState<Status | 'idle'>('idle');
  const [phase, setPhase] = useState<'arrival' | 'model'>('arrival');
  const [geoMode, setGeoMode] = useState<'intro' | 'context'>('intro');
  const [geoMounted, setGeoMounted] = useState(true);
  const start = !askFirst || accepted;

  useEffect(() => {
    if (request) {
      setAccepted(true);
      setPhase('model');
    }
  }, [request]);

  useEffect(() => {
    if (phase === 'arrival') {
      setGeoMounted(true);
      return;
    }
    const tm = setTimeout(() => setGeoMounted(false), 1000);
    return () => clearTimeout(tm);
  }, [phase]);

  const onStatus = useCallback((s: Status) => setModelStatus(s), []);
  const done = useCallback(() => setPhase('model'), []);
  // the arrival only waits for a model that is actually loading
  const modelReady = !start || modelStatus === 'ready' || modelStatus === 'error' || modelStatus === 'no-webgl';

  return (
    <section
      id="explorer"
      ref={ref}
      className={`experience is-${phase}`}
      data-tone={phase === 'arrival' ? 'dark' : 'light'}
      aria-label={t('exploreEyebrow')}
    >
      <div className="explorer-frame">
        {start ? (
          <Suspense fallback={<div className="explorer explorer--placeholder" aria-busy="true"><p className="explorer__hint">{t('preparing3d')}</p></div>}>
            <Explorer content={content} request={request} onStatus={onStatus} />
          </Suspense>
        ) : (
          <div className="explorer explorer--placeholder">
            <Picture media={{ src: '/media/renders/vue-aerienne', alt: t('exploreEyebrow'), kind: 'rendu' }} className="explorer__poster" />
            <div className="explorer__gate">
              <p>{t('gateWeight')}</p>
              <button type="button" className="btn btn--primary" onClick={() => setAccepted(true)}>
                {t('gateLoad')}
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === 'model' && (
        <button type="button" className="geo-toggle" aria-label={t('geoContext')} title={t('geoContext')} onClick={() => { setGeoMode('context'); setPhase('arrival'); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.6 2.5 13.4 0 16M12 4c-2.5 2.6-2.5 13.4 0 16" /></svg>
          <span>{t('geoContext')}</span>
        </button>
      )}

      {geoMounted && (
        <Suspense fallback={<div className="geo" />}>
          <GeoArrival
            hero={content.hero}
            mode={geoMode}
            visible={phase === 'arrival'}
            reducedMotion={reduced}
            modelReady={modelReady}
            onDone={done}
          />
        </Suspense>
      )}
    </section>
  );
}
