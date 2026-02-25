import { useCallback } from 'react';

interface UseReturnToTopOptions {
  topAnchorId?: string;
}

export const useReturnToTop = ({ topAnchorId = '__page-top' }: UseReturnToTopOptions = {}) => {
  return useCallback(() => {
    const topAnchor = document.getElementById(topAnchorId);
    if (topAnchor) {
      topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const scrollOptions: ScrollToOptions = { top: 0, behavior: 'smooth' };
    window.scrollTo(scrollOptions);
    document.documentElement.scrollTo(scrollOptions);
    document.body.scrollTo(scrollOptions);
    (document.scrollingElement as HTMLElement | null)?.scrollTo(scrollOptions);

    const scrollableElements = document.querySelectorAll<HTMLElement>('main, [data-scroll-container], [class*="scroll"]');
    scrollableElements.forEach((element) => {
      if (element.scrollHeight > element.clientHeight) {
        element.scrollTo(scrollOptions);
      }
    });
  }, [topAnchorId]);
};
