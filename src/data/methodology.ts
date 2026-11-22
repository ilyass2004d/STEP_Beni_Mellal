// ---------------------------------------------------------------------------
// From spatial data to 3D visualization — methodology
// ---------------------------------------------------------------------------
// group: 'gis' (spatial data work) or '3d' (modeling and visualization work)
// visual: image (path in public/), the GIS boundary drawn from geometry.json, or a placeholder
// ---------------------------------------------------------------------------

const t = (fr: string, en: string) => ({ fr, en });

type T = { fr: string; en: string };
export type MethodVisual =
  | { type: 'image'; src: string; alt: T; fit?: 'contain'; /** larger file opened on click */ zoom?: string }
  | { type: 'boundary' }
  | { type: 'satellite' }
  | { type: 'placeholder'; label: T };
export interface MethodStep { number: string; group: 'gis' | '3d'; title: T; text: T; contribution?: T; visual: MethodVisual }

export const methodology: MethodStep[] = [
  {
    number: '01',
    group: 'gis',
    title: t('Visite pédagogique et documentation photographique', 'Educational field visit and photographic documentation'),
    text: t(
      'Visite de la station dans le cadre d’un cours du master et photographies des ouvrages.',
      'Visit of the plant as part of a master’s course, with photographs of the units.'
    ),
    visual: { type: 'image', src: '/media/photos/entree', alt: t('Photographie de la visite.', 'Photograph from the visit.') },
  },
  {
    number: '02',
    group: 'gis',
    title: t('Collecte d’images satellitaires', 'Satellite imagery collection'),
    text: t(
      'Imagerie satellitaire Esri World Imagery, retenue pour son niveau de détail : lecture de l’organisation générale du site et de l’emprise des ouvrages.',
      'Esri World Imagery, chosen for its level of detail: reading the general layout of the site and the footprint of each unit.'
    ),
    contribution: t(
      'Base de lecture du site : contours, voirie, bassins et bâtiments.',
      'Base for reading the site: outlines, roads, basins and buildings.'
    ),
    visual: { type: 'satellite' },
  },
  {
    number: '03',
    group: 'gis',
    title: t('Préparation SIG et analyse spatiale', 'GIS preparation and spatial analysis'),
    text: t(
      'Mise en système de coordonnées (Merchich / Nord Maroc), délimitation de l’emprise de la station et analyse de son organisation.',
      'Setting up the coordinate system (Merchich / Nord Maroc), delineating the plant boundary and analysing its organisation.'
    ),
    contribution: t(
      'Une limite de 17,92 ha et un cadre métrique commun à toutes les étapes suivantes.',
      'A 17.92 ha boundary and a metric frame shared by all following steps.'
    ),
    visual: { type: 'boundary' },
  },
  {
    number: '04',
    group: 'gis',
    title: t('Cartographie 2D sous SIG', '2D site mapping in a GIS'),
    text: t(
      'Numérisation des ouvrages, de la voirie, des espaces verts et des surfaces pour produire le plan 2D du site.',
      'Digitising of the units, roads, green areas and surfaces to produce the 2D site plan.'
    ),
    contribution: t(
      'Le plan 2D sert de gabarit au modèle : les emprises SIG coïncident avec la maquette 3D.',
      'The 2D plan is the template of the model: the GIS footprints match the 3D model.'
    ),
    visual: { type: 'image', src: '/media/method/carte-situation-1600.webp', fit: 'contain', zoom: '/media/method/carte-situation-2800.webp', alt: t('Carte de situation de la STEP de Béni Mellal : localisation au Maroc et dans la région Béni Mellal-Khénifra, et plan de composition de la station.', 'Location map of the Béni Mellal WWTP: position in Morocco and in the Béni Mellal-Khénifra region, and layout plan of the plant.') },
  },
  {
    number: '05',
    group: '3d',
    title: t('Modélisation 3D sous Blender', '3D modeling using Blender'),
    text: t(
      'Construction des ouvrages en volume à partir du plan 2D, des images satellitaires et des photographies de terrain.',
      'Modeling of the units in volume from the 2D plan, the satellite imagery and the field photographs.'
    ),
    contribution: t(
      'Une maquette à l’échelle (1 unité = 1 mètre), organisée par ouvrage.',
      'A model at scale (1 unit = 1 metre), organised by unit.'
    ),
    visual: { type: 'image', src: '/media/renders/lits-bacteriens', alt: t('Rendu Blender des lits bactériens.', 'Blender render of the trickling filters.') },
  },
  {
    number: '06',
    group: '3d',
    title: t('Visualisation finale et rendu', 'Final visualization and rendering'),
    text: t(
      'Matériaux, lumière et rendus des vues d’ensemble et des détails de chaque ouvrage.',
      'Materials, lighting and renders of the overall views and of the details of each unit.'
    ),
    contribution: t(
      'Les images présentées sur ce site.',
      'The images presented on this website.'
    ),
    visual: { type: 'image', src: '/media/renders/vue-filiere', alt: t('Rendu Blender de la filière de traitement.', 'Blender render of the treatment line.') },
  },
];
