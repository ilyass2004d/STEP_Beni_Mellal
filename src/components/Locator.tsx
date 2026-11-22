import { BOUNDARY_LOCAL, EXTENT, footprintOf, ringsToPath } from '../utils/geometry';

const boundary = ringsToPath([BOUNDARY_LOCAL]);

/** Small key plan from the GIS plan: the site, all units, and the highlighted ones. */
export function Locator({ ids, allIds, label }: { ids: string[]; allIds: string[]; label: string }) {
  const all = ringsToPath(allIds.flatMap(footprintOf));
  const on = ringsToPath(ids.flatMap(footprintOf));
  return (
    <svg className="locator" viewBox={`-10 -10 ${EXTENT.width + 20} ${EXTENT.height + 20}`} role="img" aria-label={label}>
      <path className="locator__site" d={boundary} vectorEffect="non-scaling-stroke" />
      <path className="locator__all" d={all} />
      <path className="locator__on" d={on} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
