import { useState } from 'react';
import { useMediaSrc } from '../../content/media';
import { useLang } from '../../i18n/LanguageContext';
import type { MediaRef } from '../../content/types';

interface Props {
  media: MediaRef;
  sizes?: string;
  className?: string;
  eager?: boolean;
}

/** Responsive image with a graceful placeholder when the file is missing. */
export function Picture({ media, sizes = '100vw', className = '', eager = false }: Props) {
  const { t } = useLang();
  const resolved = useMediaSrc(media.src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <div className={`picture picture--missing ${className}`} role="img" aria-label={media.alt}>
        <span>{resolved ? t('imageMissing') : t('loading')}</span>
        <code>{media.src}</code>
      </div>
    );
  }
  return (
    <img
      className={`picture ${className}`}
      src={resolved.src}
      srcSet={resolved.srcSet}
      sizes={resolved.srcSet ? sizes : undefined}
      alt={media.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** The nature of each image is no longer labelled on screen (it stays in the data and the alt text). */
export function KindBadge(_props: { kind: MediaRef['kind'] }) {
  return null;
}
