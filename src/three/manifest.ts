/** Types and loader for public/models/manifest.json (exported from Blender). */
export interface ManifestPart {
  id: string;
  nom: string;
  fichier: string;
  objets: string[];
  triangles: number;
  couleurs: string[];
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface Manifest {
  projet: string;
  unite: string;
  axe_haut: string;
  parties: ManifestPart[];
  site: { min: [number, number, number]; max: [number, number, number] };
}

export const MODEL_BASE = `${import.meta.env.BASE_URL}models/`;

let pending: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  pending ??= fetch(`${MODEL_BASE}manifest.json`).then((r) => {
    if (!r.ok) throw new Error(`manifest.json introuvable (HTTP ${r.status})`);
    return r.json() as Promise<Manifest>;
  });
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

/** Site-context layers: visible in the viewer, toggleable, never selectable as structures. */
export const CONTEXT_LAYERS: { id: string; label: { fr: string; en: string }; heavy?: boolean }[] = [
  { id: 'Enceinte', label: { fr: "Socle et mur d'enceinte", en: 'Base and boundary wall' } },
  { id: 'Espaces_verts', label: { fr: 'Espaces verts', en: 'Green areas' } },
  { id: 'Voirie', label: { fr: 'Voirie', en: 'Roads' } },
  { id: 'Vegetation', label: { fr: 'Végétation', en: 'Vegetation' }, heavy: true },
  { id: 'Parking', label: { fr: 'Parking', en: 'Parking' } },
  { id: 'Portails', label: { fr: 'Portails', en: 'Gates' } },
];
