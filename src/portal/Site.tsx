import { useEffect, useState } from 'react';
import App from '../App';
import PortalHome from './PortalHome';
import { parseDestination, workspaceHash, type WorkspacePage } from './navigation';

export default function Site() {
  const [destination, setDestination] = useState(() => parseDestination(window.location.hash, window.location.search));
  useEffect(() => {
    const sync = () => { setDestination(parseDestination(window.location.hash, window.location.search)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  function home() {
    const url = new URL(window.location.href);
    url.hash = ''; url.searchParams.delete('onboarding');
    window.history.pushState({}, '', url);
    setDestination({ page: null, signup: false });
    window.scrollTo(0, 0);
  }
  const navigate = (page: WorkspacePage) => { window.location.hash = workspaceHash(page); };
  return destination.page
    ? <App initialPage={destination.page} initialSignup={destination.signup} onPortalHome={home} />
    : <PortalHome onNavigate={navigate} onAuth={signup => { window.location.hash = signup ? '#signup' : '#login'; }} />;
}
