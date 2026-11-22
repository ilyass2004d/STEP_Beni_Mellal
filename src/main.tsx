import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/source-sans-3/wght.css';
import '@fontsource-variable/source-sans-3/wght-italic.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/v2.css';
import App from './App';
import { ContentProvider } from './content/store';
import { LanguageProvider } from './i18n/LanguageContext';
import { NotFound } from './NotFound';


function Root() {
  // Relative build (GitHub Pages, any repository name): the page is the whole site.
  const base = import.meta.env.BASE_URL;
  if (!base.startsWith('/')) return <App />;
  // Absolute build: strip the deployment sub-folder before routing
  let path = window.location.pathname;
  const root = base.replace(/\/+$/, '');
  if (root && path.startsWith(root)) path = path.slice(root.length);
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/index.html') path = '/';
  if (path === '/') return <App />;
  return <NotFound />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ContentProvider>
        <Root />
      </ContentProvider>
    </LanguageProvider>
  </StrictMode>,
);
