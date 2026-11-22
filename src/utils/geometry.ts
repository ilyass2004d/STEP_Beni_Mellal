/**
 * Real geometry of the plant, generated from the GIS plan (ArcGIS, EPSG:26191)
 * by tools/build_geometry.py. Local coordinates are metres from the top-left corner
 * of the model extent (x east, y south). Model coordinates (Three.js) are centred:
 * modelX = x - W/2, modelZ = y - H/2.
 */
import geometry from '../data/geometry.json';

type Ring = number[][];
const G = geometry as unknown as {
  extent: { width: number; height: number };
  areaHa: number;
  center: [number, number];
  imageCorners: [number, number][];
  boundary: { local: Ring; lnglat: [number, number][] };
  footprints: Record<string, Ring[]>;
};

export const EXTENT = G.extent;
export const CENTER = G.center; // [lng, lat]
export const AREA_HA = G.areaHa;
export const IMAGE_CORNERS = G.imageCorners; // TL, TR, BR, BL
export const BOUNDARY_LOCAL = G.boundary.local;
export const BOUNDARY_LNGLAT = G.boundary.lnglat;

export const footprintOf = (id: string): Ring[] => G.footprints[id] ?? [];

export const ringsToPath = (rings: Ring[]) => rings.map((r) => 'M' + r.map((p) => `${p[0]},${p[1]}`).join('L') + 'Z').join('');

export function bboxOf(rings: Ring[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

function ringArea(r: Ring) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}

function inRing(r: Ring, x: number, y: number) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Unit whose footprint contains the local point (smallest footprint wins). */
export function unitAt(ids: string[], x: number, y: number): string | null {
  let best: string | null = null;
  let bestArea = Infinity;
  for (const id of ids) {
    for (const r of footprintOf(id)) {
      if (inRing(r, x, y)) {
        const a = ringArea(r);
        if (a < bestArea) { bestArea = a; best = id; }
      }
    }
  }
  return best;
}

export const localToModel = ([x, y]: number[]): [number, number] => [x - EXTENT.width / 2, y - EXTENT.height / 2];
export const modelToLocal = (mx: number, mz: number): [number, number] => [mx + EXTENT.width / 2, mz + EXTENT.height / 2];

/** Local metres -> [lng, lat] by bilinear interpolation between the image corners. */
export function localToLngLat(x: number, y: number): [number, number] {
  const u = x / EXTENT.width, v = y / EXTENT.height;
  const [tl, tr, br, bl] = IMAGE_CORNERS;
  const top = [tl[0] + (tr[0] - tl[0]) * u, tl[1] + (tr[1] - tl[1]) * u];
  const bot = [bl[0] + (br[0] - bl[0]) * u, bl[1] + (br[1] - bl[1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
}

export const formatCoord = ([lng, lat]: [number, number], d = 4) =>
  `${Math.abs(lat).toFixed(d)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(d)}° ${lng >= 0 ? 'E' : 'W'}`;
