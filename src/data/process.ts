// ---------------------------------------------------------------------------
// Treatment process of the STEP de Béni Mellal
// ---------------------------------------------------------------------------
// Sequence documented by the synoptic diagram and the visit report.
// `verification` follows the same scale as the units. Edit freely; `units` are ids from
// the content files (component ids) and are highlighted on the plan when a stage is selected.
// ---------------------------------------------------------------------------

import type { Verification } from '../content/types';

const t = (fr: string, en: string) => ({ fr, en });

export interface ProcessStage {
  id: string;
  number: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  units: string[];
  verification: Verification;
  from?: string;
  to?: string | null;
}

// Main water line, in order.
export const waterLine: ProcessStage[] = [
  {
    id: 'pretraitement',
    number: 'E1',
    name: t('Prétraitement', 'Pretreatment'),
    description: t(
      "Dégrillage, relevage, comptage et dessablage de l'eau brute.",
      'Screening, lifting, metering and grit removal of raw water.'
    ),
    units: ['pretraitement'],
    verification: 'documente',
  },
  {
    id: 'primaire',
    number: 'E2',
    name: t('Traitement primaire', 'Primary treatment'),
    description: t(
      'Décantation et dégradation anaérobie dans quatre bassins en série.',
      'Settling and anaerobic breakdown in four basins in series.'
    ),
    units: ['bassins-anaerobies'],
    verification: 'documente',
  },
  {
    id: 'secondaire',
    number: 'E3',
    name: t('Traitement secondaire', 'Secondary treatment'),
    description: t(
      'Traitement biologique sur lits bactériens, puis séparation des boues dans les clarificateurs.',
      'Biological treatment on trickling filters, then sludge separation in the clarifiers.'
    ),
    units: ['fosse-vannes-lb', 'lits-bacteriens', 'clarificateurs'],
    verification: 'documente',
  },
  {
    id: 'maturation',
    number: 'E4',
    name: t('Maturation', 'Maturation'),
    description: t(
      "Lagunage de finition qui affine la qualité de l'eau clarifiée.",
      'Polishing lagoons that refine the quality of the clarified water.'
    ),
    units: ['maturation'],
    verification: 'documente',
  },
  {
    id: 'tertiaire',
    number: 'E5',
    name: t('Traitement tertiaire', 'Tertiary treatment'),
    description: t(
      'Mesures en continu, coagulation, floculation, filtration sur sable et zone UV.',
      'Continuous measurement, coagulation, flocculation, sand filtration and UV area.'
    ),
    units: ['station-pompage', 'filtration-coagulation', 'zone-uv'],
    verification: 'partiel',
  },
];

// Secondary flows: sludge line, returns, supervision.
export const sideFlows: ProcessStage[] = [
  {
    id: 'boues',
    number: 'B1',
    from: 'primaire',
    to: null,
    name: t('Filière boues', 'Sludge line'),
    description: t(
      'Les boues décantées des bassins anaérobies sont déshydratées sur les lits de séchage.',
      'Settled sludge from the anaerobic basins is dewatered on the drying beds.'
    ),
    units: ['lits-sechage'],
    verification: 'documente',
  },
  {
    id: 'retour-boues',
    number: 'R1',
    from: 'secondaire',
    to: 'primaire',
    name: t('Retour des boues', 'Sludge return'),
    description: t(
      'Les boues des clarificateurs repartent vers les bassins anaérobies.',
      'Sludge from the clarifiers is sent back to the anaerobic basins.'
    ),
    units: ['clarificateurs', 'bassins-anaerobies'],
    verification: 'documente',
  },
  {
    id: 'retours',
    number: 'R2',
    from: 'tertiaire',
    to: 'primaire',
    name: t('Eaux sales de lavage', 'Dirty wash water'),
    description: t(
      'Les eaux de lavage des filtres à sable sont collectées puis renvoyées vers le traitement primaire.',
      'Sand filter wash water is collected and sent back to primary treatment.'
    ),
    units: ['eau-sale-lavage'],
    verification: 'documente',
  },
];

export const supervision: ProcessStage = {
  id: 'supervision',
  number: 'S',
  name: t('Supervision', 'Supervision'),
  description: t(
    'Les mesures sont transmises au centre de contrôle, d’où le traitement tertiaire est piloté.',
    'Measurements are sent to the control centre, from which tertiary treatment is operated.'
  ),
  units: ['centre-controle'],
  verification: 'documente',
};

export const allStages = [...waterLine, ...sideFlows, supervision];
export const stageById: Record<string, ProcessStage> = Object.fromEntries(allStages.map((s) => [s.id, s]));
