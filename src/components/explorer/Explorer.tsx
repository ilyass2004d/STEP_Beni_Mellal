import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sortedVisibleComponents } from '../../content/store';
import type { SiteContent, StepComponent } from '../../content/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CONTEXT_LAYERS, loadManifest, type Manifest } from '../../three/manifest';
import { StepViewer, webglAvailable } from '../../three/StepViewer';
import { InfoPanel } from '../InfoPanel';
import { Picture } from '../media/Picture';
import { Icon } from '../Icon';
import { useLang } from '../../i18n/LanguageContext';
import { BOUNDARY_LOCAL, bboxOf, footprintOf, localToModel, modelToLocal, unitAt } from '../../utils/geometry';

export interface SelectionRequest {
  id: string;
  nonce: number;
}

interface Props {
  content: SiteContent;
  request: SelectionRequest | null;
  /** reports loading state to the page (the satellite arrival waits for 'ready') */
  onStatus?(status: Status): void;
}

export type Status = 'loading' | 'ready' | 'error' | 'no-webgl';

const isSmallScreen = () => window.matchMedia('(max-width: 760px)').matches;
const isTouch = () => window.matchMedia('(hover: none)').matches;

const ringsModel = (id: string) => footprintOf(id).map((r) => r.map((p) => localToModel(p)));

/** Colour of each treatment stage in the list (sand → water → sludge / supervision). */
const STAGE_COLOR: Record<string, string> = {
  pretraitement: '#b39a63',
  primaire: '#7d9a6a',
  secondaire: '#3f9a80',
  maturation: '#4a93b3',
  tertiaire: '#2f6c95',
  boues: '#9c6b48',
  supervision: '#c9785f',
  annexe: '#9aa39e',
};

const isolateParts = (c: StepComponent) => (c.modelParts.length ? c.modelParts : c.contextParts ?? []);

export default function Explorer({ content, request, onStatus }: Props) {
  const { t, tr } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<StepViewer | null>(null);
  const reduced = useReducedMotion();

  const [status, setStatus] = useState<Status>(() => (webglAvailable() ? 'loading' : 'no-webgl'));
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [failedParts, setFailedParts] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wheelHint, setWheelHint] = useState(false);
  const wheelTimer = useRef(0);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [listOpen, setListOpen] = useState(() => !isSmallScreen());
  const [isolated, setIsolated] = useState(false);
  const [layers, setLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONTEXT_LAYERS.map((l) => [l.id, !(l.heavy && isSmallScreen())])),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [attempt, setAttempt] = useState(0);

  const components = useMemo(() => sortedVisibleComponents(content), [content]);
  const partToComponent = useMemo(() => {
    const map = new Map<string, StepComponent>();
    for (const c of components) for (const p of c.modelParts) map.set(p, c);
    return map;
  }, [components]);
  const selected = components.find((c) => c.id === selectedId) ?? null;
  const footprintIds = useMemo(() => components.filter((c) => footprintOf(c.id).length).map((c) => c.id), [components]);
  const footprintIdsRef = useRef(footprintIds);
  footprintIdsRef.current = footprintIds;
  const componentsRef = useRef(components);
  componentsRef.current = components;

  // part or footprint under the pointer -> structure
  // a part that belongs to one structure always wins; the footprints only split a part
  // shared by several structures (the « Lagunes » part holds two basin series)
  const resolve = (partId: string | null, point: [number, number] | null) => {
    const own = partId ? partToComponentRef.current.get(partId) : undefined;
    if (own) return own;
    if (point && partId) {
      const [lx, ly] = modelToLocal(point[0], point[1]);
      const id = unitAt(footprintIdsRef.current, lx, ly);
      if (id) return componentsRef.current.find((c) => c.id === id);
    }
    return undefined;
  };
  const focusComponent = (v: StepViewer | null, c: StepComponent) => {
    const rings = footprintOf(c.id);
    if (rings.length) {
      const [x0, y0, x1, y1] = bboxOf(rings);
      const [a, b] = localToModel([x0, y0]);
      const [cx, d] = localToModel([x1, y1]);
      v?.focusBounds(a, b, cx, d);
    } else v?.focus(c.modelParts);
  };
  const focusRef = useRef(focusComponent);
  focusRef.current = focusComponent;
  const stages = content.stages.filter((s) => components.some((c) => c.stage === s.id));

  // Stable callbacks for the engine
  const partToComponentRef = useRef(partToComponent);
  partToComponentRef.current = partToComponent;
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // ------------------------------------------------------------ engine setup
  useEffect(() => {
    if (status === 'no-webgl' || !canvasRef.current) return;
    let cancelled = false;
    let viewer: StepViewer;
    try {
      viewer = new StepViewer(
        canvasRef.current,
        {
          onProgress: (loaded, total) => !cancelled && setProgress({ loaded, total }),
          onPartError: (id) => !cancelled && setFailedParts((f) => [...f, id]),
          onPick: (partId, point) => selectRef.current(resolve(partId, point)?.id ?? null),
          onWheelBlocked: () => {
            setWheelHint(true);
            clearTimeout(wheelTimer.current);
            wheelTimer.current = window.setTimeout(() => setWheelHint(false), 1600);
          },
          onHover: (partId, x, y, point) => {
            const c = resolve(partId, point);
            viewerRef.current?.setCursor(Boolean(c));
            setHover(c ? { name: c.shortName ?? c.name, x, y } : null);
          },
        },
        reduced,
      );
    } catch {
      setStatus('no-webgl');
      return;
    }
    viewerRef.current = viewer;
    viewer.setOutline(BOUNDARY_LOCAL.map((p) => localToModel(p)));
    viewer.setActive(true);
    if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __stepViewer?: StepViewer }).__stepViewer = viewer;

    loadManifest()
      .then(async (m) => {
        if (cancelled) return;
        setManifest(m);
        const known = new Set(m.parties.map((p) => p.id));
        const structural = m.parties.map((p) => p.id).filter((id) => !CONTEXT_LAYERS.some((l) => l.id === id));
        const contextNow = CONTEXT_LAYERS.filter((l) => !l.heavy && known.has(l.id)).map((l) => l.id);
        // structures and light context first, heavy vegetation afterwards (only if enabled)
        await viewer.load(m, [...contextNow, ...structural]);
        if (cancelled) return;
        setStatus('ready');
        const heavy = CONTEXT_LAYERS.filter((l) => l.heavy && known.has(l.id)).map((l) => l.id);
        for (const id of heavy) viewer.setLayerVisible(id, layersRef.current[id]);
        const wanted = heavy.filter((id) => layersRef.current[id]);
        if (wanted.length) await viewer.load(m, wanted);
      })
      .catch(() => !cancelled && setStatus('error'));

    return () => {
      cancelled = true;
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, reduced]);

  useEffect(() => {
    viewerRef.current?.setPickable([...partToComponent.keys(), ...components.flatMap((c) => c.contextParts ?? [])]);
  }, [partToComponent, components, status]);

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  // Pause rendering when offscreen or when the tab is hidden
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let visible = true;
    const sync = () => viewerRef.current?.setActive(visible && document.visibilityState === 'visible');
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [status]);

  // ------------------------------------------------------------ selection
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    // the model dims, the selected structure keeps its colours; when it shares a part with
    // other structures (basins in « Lagunes »), their footprints are darkened as well
    const lit = selected ? isolateParts(selected) : [];
    const masks =
      selected && !selected.modelParts.length
        ? components
            .filter((c) => c.id !== selected.id && !c.modelParts.length && (c.contextParts ?? []).some((p) => lit.includes(p)))
            .flatMap((c) => ringsModel(c.id))
        : [];
    v.highlight(lit, Boolean(selected), masks);
    if (!selected && isolated) {
      setIsolated(false);
      v.isolate(null);
    }
  }, [selected, isolated, status]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      const c = components.find((x) => x.id === id);
      if (c && isolated) viewerRef.current?.isolate(isolateParts(c), ['Enceinte', 'Espaces_verts']);
      if (c) focusComponent(viewerRef.current, c);
      if (c && isSmallScreen()) setListOpen(false);
    },
    [components, isolated],
  );
  const selectRef = useRef(select);
  selectRef.current = select;

  // Escape closes the sheet
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.fullscreenElement) return;
      const el = document.activeElement;
      if (el && wrapRef.current && !wrapRef.current.contains(el) && el !== document.body) return;
      selectRef.current(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // Requests coming from the rest of the page (e.g. « Voir en 3D » in chapter 04)
  useEffect(() => {
    if (request && status === 'ready') select(request.id);
    else if (request && status !== 'loading') setSelectedId(request.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, status]);

  const toggleIsolate = () => {
    const v = viewerRef.current;
    if (!v || !selected) return;
    const next = !isolated;
    setIsolated(next);
    v.isolate(next ? isolateParts(selected) : null, ['Enceinte', 'Espaces_verts']);
    focusComponent(v, selected);
  };

  const toggleLayer = (id: string) => {
    const next = !layers[id];
    setLayers((l) => ({ ...l, [id]: next }));
    const v = viewerRef.current;
    if (!v) return;
    v.setLayerVisible(id, next);
    if (next && manifest && !v.hasPart(id)) void v.load(manifest, [id]);
  };

  const resetAll = () => {
    setSelectedId(null);
    setIsolated(false);
    viewerRef.current?.isolate(null);
    viewerRef.current?.resetView();
  };

  // ------------------------------------------------------------ fullscreen
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenEnabled) {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    } else {
      setFullscreen((f) => !f); // CSS fallback (iOS Safari)
    }
  };
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  useEffect(() => {
    if (!fullscreen || document.fullscreenElement) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const noWebgl = status === 'no-webgl';
  const touch = typeof window !== 'undefined' && isTouch();
  const pct = progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div
      ref={wrapRef}
      className={`explorer ${fullscreen ? 'is-fullscreen' : ''} ${listOpen ? 'has-list' : ''} ${selected ? 'has-panel' : ''}`}
    >
      <div ref={canvasRef} className="explorer__canvas">
        {noWebgl && (
          <div className="explorer__fallback">
            <Picture
              media={{ src: '/media/renders/vue-aerienne', alt: t('exploreEyebrow'), kind: 'rendu' }}
              sizes="100vw"
            />
            <p>{t('noWebgl')}</p>
          </div>
        )}
      </div>

      {hover && !touch && (
        <div className="explorer__tooltip" style={{ transform: `translate(${hover.x + 14}px, ${hover.y + 14}px)` }} aria-hidden="true">
          {hover.name}
        </div>
      )}

      <div className="explorer__hint" aria-live="polite">
        {status === 'loading' && (
          <span className="explorer__loading">
            <span className="explorer__bar" style={{ transform: `scaleX(${pct / 100})` }} />
            {t('loadingModel')} : {progress.loaded}/{progress.total || '…'} {t('pieces')}
          </span>
        )}
        {status === 'ready' &&
          (touch ? t('hintTouch') : t('hintMouse'))}
        {status === 'ready' && failedParts.length > 0 && (
          <span className="explorer__warn">, {failedParts.length} {t('failedParts')} : {failedParts.join(', ')}</span>
        )}
      </div>

      <p className={`explorer__wheel ${wheelHint ? 'is-on' : ''}`} role="status">
        {wheelHint ? t('ctrlZoom') : ''}
      </p>

      {status === 'error' && (
        <div className="explorer__error" role="alert">
          <p>{t('modelError')}</p>
          <button type="button" className="btn btn--light" onClick={() => { setStatus('loading'); setFailedParts([]); setAttempt((a) => a + 1); }}>
            {t('retry')}
          </button>
        </div>
      )}

      <nav className={`explorer__list ${listOpen ? 'is-open' : ''}`} aria-label={t('unitsAria')} id="explorer-list">
        <div className="explorer__list-scroll">
          <p className="explorer__heading">
            {t('units')}
            <span className="explorer__count">{components.length}</span>
          </p>
          {stages.map((s) => (
            <div key={s.id} className="explorer__group" style={{ ['--stage' as string]: STAGE_COLOR[s.id] ?? 'var(--grey)' }}>
              <p className="explorer__stage">
                <i aria-hidden="true" />
                {s.label}
              </p>
              <ul>
                {components
                  .filter((c) => c.stage === s.id)
                  .map((c) => (
                    <li key={c.id}>
                      <button type="button" aria-pressed={selectedId === c.id} onClick={() => select(selectedId === c.id ? null : c.id)}>
                        {c.shortName ?? c.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {!noWebgl && (
            <div className="explorer__group">
              <p className="label">{t('layers')}</p>
              <ul className="explorer__layers">
                {CONTEXT_LAYERS.filter((l) => !manifest || manifest.parties.some((p) => p.id === l.id)).map((l) => (
                  <li key={l.id}>
                    <label>
                      <input type="checkbox" checked={layers[l.id]} onChange={() => toggleLayer(l.id)} />
                      {tr(l.label)}
                      {l.heavy && <small> ({t('heavy')})</small>}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </nav>

      {selected && (
        <div className="explorer__panel">
          <InfoPanel
            component={selected}
            content={content}
            headingLevel={3}
            onClose={() => select(null)}
            actions={
              !noWebgl && (
                <>
                  <button type="button" className="btn btn--ghost" onClick={() => focusComponent(viewerRef.current, selected)}>
                    {t('centerView')}
                  </button>
                  <button type="button" className="btn btn--ghost" aria-pressed={isolated} onClick={toggleIsolate}>
                    {isolated ? t('showAll') : t('isolateThis')}
                  </button>
                </>
              )
            }
          />
        </div>
      )}

      <div className="explorer__toolbar" role="toolbar" aria-label={t('toolbarAria')}>
        <button type="button" className="tool" aria-expanded={listOpen} aria-controls="explorer-list" onClick={() => setListOpen((o) => !o)}>
          <Icon name="list" />
          <span>{t('units')}</span>
        </button>
        {!noWebgl && (
          <>
            <button type="button" className="tool" onClick={resetAll} disabled={status !== 'ready'}>
              <Icon name="home" />
              <span>{t('overview')}</span>
            </button>
            <button type="button" className="tool" onClick={() => (selected ? focusComponent(viewerRef.current, selected) : viewerRef.current?.focus())} disabled={status !== 'ready'}>
              <Icon name="fit" />
              <span>{t('frame')}</span>
            </button>
            <button type="button" className="tool" aria-pressed={isolated} onClick={toggleIsolate} disabled={!selected || status !== 'ready'}>
              <Icon name="isolate" />
              <span>{t('isolate')}</span>
            </button>
          </>
        )}
        <button type="button" className="tool" aria-pressed={fullscreen} onClick={toggleFullscreen}>
          <Icon name={fullscreen ? 'collapse' : 'expand'} />
          <span>{fullscreen ? t('exitFullscreen') : t('fullscreen')}</span>
        </button>
      </div>
    </div>
  );
}
