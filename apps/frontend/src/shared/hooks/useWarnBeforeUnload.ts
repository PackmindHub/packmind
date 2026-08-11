import { useEffect } from 'react';

/**
 * Asks the browser to confirm a reload or a tab close while `enabled`.
 *
 * The wording of the prompt belongs to the browser: every major one has ignored
 * the string a page supplies for years, precisely so a page cannot write its own
 * dialog text. So this can ask *whether* to interrupt but never say why — the
 * reason has to be on the page itself, next to whatever is still running.
 *
 * In-app navigation does not go through the browser at all and is unaffected.
 */
export function useWarnBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const confirmUnload = (event: BeforeUnloadEvent) => {
      // preventDefault is the specified opt-in; assigning returnValue is what
      // browsers that predate it still read. Both, or the prompt is a coin toss.
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', confirmUnload);
    return () => window.removeEventListener('beforeunload', confirmUnload);
  }, [enabled]);
}
