import type { SiteContent } from '../content/types';
import { useLang } from '../i18n/LanguageContext';
import { author } from '../data/author';
import { withBase } from '../content/media';

export function About({ content }: { content: SiteContent }) {
  const { t, tr } = useLang();
  const { about, sources } = content;
  return (
    <section id="apropos" className="about" data-tone="light" aria-labelledby="apropos-title">
      <div className="about__grid">
        <div>
          <p className="eyebrow">{t('about')}</p>
          <h2 id="apropos-title" className="section-title">
            {about.title}
          </h2>
          <p className="section-lead">{about.text}</p>
          <p className="about__signature">{about.signature}</p>
          <p className="about__disclaimer">{about.disclaimer}</p>
        </div>

        <div className="about__cols">
          <div>
            <h3 className="label">{t('credits')}</h3>
            <dl className="credits">
              {about.credits.map((c, i) => (
                <div key={`${c.role}-${i}`}>
                  <dt>{c.role}</dt>
                  <dd>{c.name}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="label">{t('sources')}</h3>
            <ol className="sources">
              {sources.map((s) => (
                <li key={s.id}>
                  <strong>{s.label}</strong>
                  {s.detail && <span>{s.detail}</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="author" aria-labelledby="author-name">
        <div className="author__photo">
          {author.photo ? (
            <img src={withBase(author.photo)} alt={author.name} width={360} height={450} loading="lazy" />
          ) : (
            <div className="picture picture--missing" role="img" aria-label={t('photoReserved')}>
              <span>{t('photoReserved')}</span>
            </div>
          )}
        </div>
        <div className="author__body">
          <p className="label">{t('author')}</p>
          <h3 id="author-name" className="author__name">{author.name}</h3>
          <p className="author__position">{tr(author.position)}</p>
          <p className="author__sig">{author.signature.join(', ')}</p>
          <p className="label">{t('interests')}</p>
          <ul className="author__interests">
            {author.interests.map((i) => (
              <li key={i.en}>{tr(i)}</li>
            ))}
          </ul>
          <ul className="author__links">
            {author.links.map((l) => (
              <li key={l.href}>
                {l.href.startsWith('mailto:') ? (
                  <a href={l.href}>{l.label} ↗</a>
                ) : (
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label} ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
