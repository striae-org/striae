import { useEffect } from 'react';
import { useLocation, useNavigate } from '@remix-run/react';

const PENDING_HASH_SCROLL_KEY = 'pendingHashScroll';

const scrollToHashTarget = (hash: string) => {
  const targetId = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!targetId) return;

  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export const useHashlessScrollNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleHashLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const targetHash = url.hash && url.hash !== '#' ? url.hash : '#top';

      event.preventDefault();

      const cleanPath = `${url.pathname}${url.search}`;
      const currentPath = `${location.pathname}${location.search}`;

      if (cleanPath === currentPath) {
        scrollToHashTarget(targetHash);
        return;
      }

      sessionStorage.setItem(PENDING_HASH_SCROLL_KEY, JSON.stringify({
        path: cleanPath,
        hash: targetHash,
      }));

      navigate(cleanPath);
    };

    document.addEventListener('click', handleHashLinkClick, true);

    return () => {
      document.removeEventListener('click', handleHashLinkClick, true);
    };
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_HASH_SCROLL_KEY);
    if (!pending) return;

    try {
      const parsed = JSON.parse(pending) as { path?: string; hash?: string };
      const currentPath = `${location.pathname}${location.search}`;
      if (parsed.path !== currentPath || !parsed.hash) return;

      scrollToHashTarget(parsed.hash);
      sessionStorage.removeItem(PENDING_HASH_SCROLL_KEY);
    } catch {
      sessionStorage.removeItem(PENDING_HASH_SCROLL_KEY);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!location.hash) return;

    scrollToHashTarget(location.hash);

    const cleanUrl = `${location.pathname}${location.search}`;
    window.history.replaceState(window.history.state, '', cleanUrl);
  }, [location.hash, location.pathname, location.search]);
};
