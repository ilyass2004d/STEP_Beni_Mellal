// Author presentation (About section). Texts are { fr, en }.
const t = (fr: string, en: string) => ({ fr, en });

export const author = {
  name: 'Ilyass Zerqtouni',
  signature: ['3D Modeling & Visualization', 'Environmental Geomatics | GIS | Remote Sensing'],
  position: t(
    'Doctorant, Université Cadi Ayyad, Faculté des Sciences et Techniques, Marrakech',
    'PhD Candidate, Cadi Ayyad University, Faculty of Sciences and Techniques, Marrakech',
  ),
  interests: [
    t('Géomatique', 'Geomatics'),
    t('Modélisation', 'Modeling'),
    t('Programmation', 'Programming'),
    t('Agriculture', 'Agriculture'),
    t('Hydrologie', 'Hydrology'),
    t('Climatologie', 'Climatology'),
    t('Télédétection', 'Remote Sensing'),
    t('SIG', 'GIS'),
  ],
  /** Portrait (4:5) in public/media/. */
  photo: '/media/author-portrait.webp' as string | null,
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zerqtouni' },
    { label: 'GitHub', href: 'https://github.com/ilyass2004d' },
    { label: 'Email : ilyasszerqtouni5@gmail.com', href: 'mailto:ilyasszerqtouni5@gmail.com' },
  ],
};
