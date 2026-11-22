import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SiteContent } from '../../content/types';
import { mapConfig } from '../../data/mapConfig';
import { useLang } from '../../i18n/LanguageContext';
import { homeView } from '../../three/StepViewer';
import { BOUNDARY_LNGLAT, BOUNDARY_LOCAL, CENTER, IMAGE_CORNERS, formatCoord, localToLngLat, localToModel, modelToLocal } from '../../utils/geometry';
import { withBase } from '../../content/media';
import { Icon } from '../Icon';
import { MapFallback } from './MapFallback';

const STEPS = ['seq1', 'seq2', 'seq3', 'seq4', 'seq5'] as const;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EARTH = 2 * Math.PI * 6378137;
// paint *-transition properties are valid style spec but missing from the typings
const layer = (l: object) => l as Parameters<MlMap['addLayer']>[0];

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Map camera that reproduces the home view of the 3D model, for a seamless hand-over. */
function modelCamera(width: number, height: number) {
  const h = homeView(BOUNDARY_LOCAL.map((p) => localToModel(p)), width / height);
  const dx = h.position[0] - h.target[0];
  const dy = h.position[1] - h.target[1];
  const dz = h.position[2] - h.target[2];
  const horiz = Math.hypot(dx, dz);
  const dist = Math.hypot(horiz, dy);
  const center = localToLngLat(...modelToLocal(h.target[0], h.target[2]));
  const mapFov = 36.8699; // MapLibre default vertical field of view
  const effective = (dist * Math.tan((h.fov / 2) * (Math.PI / 180))) / Math.tan((mapFov / 2) * (Math.PI / 180));
  const camPx = (0.5 * height) / Math.tan((mapFov / 2) * (Math.PI / 180));
  const mpp = effective / camPx;
  const zoom = Math.log2((EARTH * Math.cos((center[1] * Math.PI) / 180)) / (512 * mpp));
  return {
    center,
    zoom,
    pitch: (Math.atan2(horiz, dy) * 180) / Math.PI,
    bearing: (Math.atan2(-dx, dz) * 180) / Math.PI,
  };
}

interface Props {
  hero: SiteContent['hero'];
  mode: 'intro' | 'context';
  visible: boolean;
  reducedMotion: boolean;
  modelReady: boolean;
  onDone(): void;
}

/** Satellite arrival: region → approach → oblique view on the GIS boundary → model overlay → 3D model. */
export default function GeoArrival({ hero, mode, visible, reducedMotion, modelReady, onDone }: Props) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const cancelled = useRef(false);
  const readyRef = useRef(modelReady);
  readyRef.current = modelReady;
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>(mapConfig.enabled && hasWebGL() ? 'loading' : 'fallback');
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const seq = mapConfig.sequence;
  const context = mode === 'context';

  useEffect(() => {
    if (status === 'fallback') return;
    cancelled.current = false;
    let map: MlMap | undefined;
    let timer = 0;
    let tilesOk = false;
    (async () => {
      const { default: maplibregl } = await import('maplibre-gl');
      if (cancelled.current || !box.current) return;
      const cam = modelCamera(box.current.clientWidth || window.innerWidth, box.current.clientHeight || window.innerHeight);
      map = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
          sources: {
            sat: { type: 'raster', tiles: mapConfig.tiles, tileSize: mapConfig.tileSize, maxzoom: mapConfig.maxzoom, attribution: mapConfig.attribution },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#0d2722' } },
            { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 300, 'raster-saturation': -0.2 } },
          ],
        },
        center: context ? cam.center : CENTER,
        zoom: context ? cam.zoom : seq.region.zoom,
        pitch: context ? cam.pitch : 0,
        bearing: context ? cam.bearing : 0,
        interactive: context,
        maxPitch: 70,
        attributionControl: { compact: false },
      });
      mapRef.current = map;
      if (location.search.includes('debug')) (window as unknown as { __map?: MlMap }).__map = map;
      if (context) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.on('data', (e) => {
        if ((e as { sourceId?: string; tile?: unknown }).sourceId === 'sat' && (e as { tile?: unknown }).tile) tilesOk = true;
      });
      map.on('error', () => {
        /* tile errors are handled by the timeout */
      });
      map.on('load', () => {
        map!.addSource('boundary', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [BOUNDARY_LNGLAT] } } });
        map!.addSource('model', { type: 'image', url: withBase('/media/model/plan-top-1200.webp'), coordinates: IMAGE_CORNERS as [[number, number], [number, number], [number, number], [number, number]] });
        map!.addLayer(layer({ id: 'model', type: 'raster', source: 'model', paint: { 'raster-opacity': context ? 1 : 0, 'raster-opacity-transition': { duration: seq.reveal.duration, delay: 0 }, 'raster-fade-duration': 0 } }));
        map!.addLayer(layer({ id: 'boundary-glow', type: 'line', source: 'boundary', paint: { 'line-color': '#65bfa7', 'line-width': 7, 'line-blur': 6, 'line-opacity': context ? 0.35 : 0, 'line-opacity-transition': { duration: 1200, delay: 0 } } }));
        map!.addLayer(layer({ id: 'boundary', type: 'line', source: 'boundary', paint: { 'line-color': '#d9f0ee', 'line-width': 1.5, 'line-opacity': context ? 1 : 0, 'line-opacity-transition': { duration: 1200, delay: 0 } } }));
        if (context) setStep(3);
      });
      timer = window.setTimeout(() => !tilesOk && !cancelled.current && setStatus('fallback'), mapConfig.timeoutMs);
      map.on('idle', () => {
        if (tilesOk && !cancelled.current) {
          clearTimeout(timer);
          setStatus((s) => (s === 'loading' ? 'ready' : s));
        }
      });
    })().catch(() => setStatus('fallback'));
    return () => {
      cancelled.current = true;
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'fallback', mode]);

  const run = useCallback(async () => {
    const map = mapRef.current;
    if (!map || running || !box.current) return;
    setRunning(true);
    const moved = () => new Promise((r) => map.once('moveend', r));
    try {
      const cam = modelCamera(box.current.clientWidth, box.current.clientHeight);
      setStep(1);
      map.flyTo({ center: cam.center, zoom: seq.approach.zoom, duration: seq.approach.duration, curve: 1.5, essential: true });
      await moved();
      if (cancelled.current) return;
      setStep(2);
      map.setPaintProperty('boundary', 'line-opacity', 1);
      map.setPaintProperty('boundary-glow', 'line-opacity', 0.35);
      map.easeTo({ ...cam, duration: seq.oblique.duration, easing: (x) => 1 - Math.pow(1 - x, 3), essential: true });
      await moved();
      if (cancelled.current) return;
      setStep(3);
      map.setPaintProperty('model', 'raster-opacity', 1);
      await wait(seq.reveal.duration + 150);
      // wait for the 3D model (bounded), then hand over
      const t0 = performance.now();
      if (!readyRef.current) setWaiting(true);
      while (!readyRef.current && performance.now() - t0 < seq.maxWaitForModel && !cancelled.current) await wait(200);
      setWaiting(false);
      if (cancelled.current) return;
      setStep(4);
      map.setPaintProperty('boundary-glow', 'line-opacity', 0);
      await wait(350);
      if (!cancelled.current) onDone();
    } catch {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, onDone]);

  useEffect(() => {
    if (status !== 'ready' || context || reducedMotion) return;
    const tm = setTimeout(run, 700);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, context, reducedMotion]);

  const skip = () => {
    cancelled.current = true;
    onDone();
  };
  const toJourney = () => {
    skip();
    document.getElementById('parcours')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className={`geo geo--${status} ${visible ? '' : 'is-hidden'} ${context ? 'geo--context' : ''}`} aria-hidden={!visible}>
      {status === 'fallback' ? <MapFallback context={context} reducedMotion={reducedMotion} onDone={onDone} /> : <div ref={box} className="geo__map" />}
      <div className="geo__veil" aria-hidden="true" />

      {status === 'loading' && (
        <p className="geo__loading" role="status">
          <span className="geo__bar" />
          {t('loadingMap')}
        </p>
      )}

      {!context && (
        <div className={`geo__intro ${step > 0 ? 'is-quiet' : ''}`}>
          <p className="eyebrow">
            {hero.eyebrow}, {formatCoord(CENTER)}
          </p>
          <h1 className="hero__title geo__title">{hero.title}</h1>
          <p className="hero__subtitle">{hero.subtitle}</p>
          {status === 'fallback' && <p className="geo__notice">{t('mapUnavailable')}</p>}
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={status === 'ready' && !running && !reducedMotion ? run : skip}>
              {hero.primaryCta}
              <Icon name="arrow" />
            </button>
            <button type="button" className="btn btn--ghost-light" onClick={toJourney}>
              {hero.secondaryCta}
            </button>
          </div>
        </div>
      )}

      {status !== 'fallback' && (
        <div className="geo__caption" aria-live="polite">
          <span className="geo__step">
            {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <span>{waiting ? `${t('waitingModel')}…` : t(STEPS[step])}</span>
        </div>
      )}

      <div className="geo__actions">
        {context ? (
          <button type="button" className="btn btn--light" onClick={onDone}>
            {t('backToModel')}
          </button>
        ) : (
          running && (
            <button type="button" className="btn btn--ghost-light" onClick={skip}>
              {t('skipIntro')}
            </button>
          )
        )}
      </div>
    </div>
  );
}
