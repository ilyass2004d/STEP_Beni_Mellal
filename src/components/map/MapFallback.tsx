import { useEffect } from 'react';
import { BOUNDARY_LOCAL, EXTENT, ringsToPath } from '../../utils/geometry';

/** Without imagery or WebGL: the real GIS boundary is drawn instead of the satellite view. */
export function MapFallback({ context, reducedMotion, onDone }: { context: boolean; reducedMotion: boolean; onDone(): void }) {
  useEffect(() => {
    if (context) return;
    const tm = setTimeout(onDone, reducedMotion ? 3000 : 5200);
    return () => clearTimeout(tm);
  }, [context, reducedMotion, onDone]);

  return (
    <div className="geo__fallback" aria-hidden="true">
      <svg viewBox={`-60 -60 ${EXTENT.width + 120} ${EXTENT.height + 120}`} className="geo__outline">
        <path d={ringsToPath([BOUNDARY_LOCAL])} pathLength={1} />
      </svg>
    </div>
  );
}
