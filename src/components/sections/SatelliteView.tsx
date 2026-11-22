import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapConfig } from '../../data/mapConfig';
import { BOUNDARY_LNGLAT, IMAGE_CORNERS } from '../../utils/geometry';

/** Methodology step 2: the Esri imagery used for the project, with the GIS boundary. Static view. */
export function SatelliteView({ fallback }: { fallback: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!mapConfig.enabled);

  useEffect(() => {
    if (failed) return;
    let map: MlMap | undefined;
    let cancelled = false;
    let tilesOk = false;
    const timer = window.setTimeout(() => !tilesOk && setFailed(true), mapConfig.timeoutMs);
    (async () => {
      const { default: maplibregl } = await import('maplibre-gl');
      if (cancelled || !box.current) return;
      const lngs = IMAGE_CORNERS.map((c) => c[0]);
      const lats = IMAGE_CORNERS.map((c) => c[1]);
      map = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
          sources: { sat: { type: 'raster', tiles: mapConfig.tiles, tileSize: mapConfig.tileSize, maxzoom: mapConfig.maxzoom, attribution: mapConfig.attribution } },
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
        },
        bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        fitBoundsOptions: { padding: 24 },
        interactive: false,
        attributionControl: { compact: true },
      });
      map.on('data', (e) => {
        if ((e as { sourceId?: string; tile?: unknown }).sourceId === 'sat' && (e as { tile?: unknown }).tile) tilesOk = true;
      });
      map.on('load', () => {
        map!.addSource('b', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [BOUNDARY_LNGLAT] } } });
        map!.addLayer({ id: 'b', type: 'line', source: 'b', paint: { 'line-color': '#d9f0ee', 'line-width': 1.5 } });
      });
    })().catch(() => setFailed(true));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
    };
  }, [failed]);

  if (failed) return <>{fallback}</>;
  return <div ref={box} className="satview" role="img" aria-label="Esri World Imagery" />;
}
