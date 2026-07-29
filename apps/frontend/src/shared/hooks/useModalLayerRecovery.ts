import { useEffect } from 'react';

/**
 * Recovers the page when a Chakra dialog/drawer leaves its barriers behind.
 *
 * Chakra v3 modals run on `@zag-js/dialog`, whose `open` state installs four
 * effects: `trackDismissableElement` (sets `body{pointer-events:none}` and
 * `data-inert`), `preventScroll` (sets `body{overflow:hidden}` and
 * `data-scroll-lock`), `hideContentBelow` (sets `aria-hidden` on everything
 * beside the dialog) and `trapFocus`.
 *
 * `@zag-js/react` stores one cleanup per state path and, up to v1.41.2,
 * *overwrites* it when the same state is entered twice:
 *
 *     if (cleanup) effects.current.set(item.path, cleanup)
 *
 * The replaced cleanup is then unreachable, so a dialog can have its DOM
 * removed while all four effects stay installed. `disablePointerEventsOutside`
 * only restores the body once no pointer-blocking layer is left on its
 * module-global stack, so a stranded layer wedges the whole page — every click
 * is swallowed and nothing recovers it but a reload.
 *
 * React StrictMode's double-invoked effects (dev only) and Vite HMR both drive
 * the enter-twice cycle that triggers the overwrite.
 *
 * v1.42.0 chains the cleanups instead of replacing them, which fixes the root
 * cause, but no released Chakra or Ark pulls it yet — the latest Ark (5.37.2)
 * pins zag 1.41.2. Remove this hook once the dependency graph reaches 1.42.0.
 */

/** Marks a zag layer that is on screen right now. */
const OPEN_LAYER_SELECTOR = [
  '[data-scope="dialog"][data-part="content"]',
  '[data-scope="drawer"][data-part="content"]',
  '[data-scope="popover"][data-part="content"]',
  '[data-scope="dialog"][data-part="positioner"]',
  '[data-scope="drawer"][data-part="positioner"]',
  '[data-scope="dialog"][data-part="backdrop"]',
  '[data-scope="drawer"][data-part="backdrop"]',
].join(',');

/** The bookkeeping attribute `hideOthers` leaves on the elements it hides. */
const ARIA_HIDDEN_MARKER = '[data-aria-hidden]';

function hasOpenLayer(doc: Document): boolean {
  return doc.querySelector(OPEN_LAYER_SELECTOR) !== null;
}

/**
 * `hideOthers` keeps its refcounts in module-global maps that a stranded layer
 * never decrements, so a later dialog can re-hide an element without restoring
 * its marker. Collecting marked elements *and* aria-hidden children of body —
 * the only place `hideOthers` starts from — catches that aftermath too.
 */
function hiddenElements(doc: Document): Element[] {
  const marked = Array.from(doc.querySelectorAll(ARIA_HIDDEN_MARKER));
  const unmarked = Array.from(doc.body.children).filter(
    (element) =>
      element.getAttribute('aria-hidden') === 'true' &&
      !marked.includes(element),
  );
  return [...marked, ...unmarked];
}

function hasLeakedBarrier(doc: Document): boolean {
  const { body } = doc;
  return (
    body.style.pointerEvents === 'none' ||
    body.hasAttribute('data-inert') ||
    body.hasAttribute('data-scroll-lock') ||
    hiddenElements(doc).length > 0
  );
}

function clearLeakedBarrier(doc: Document): void {
  const { body } = doc;

  body.style.pointerEvents = '';
  body.style.overflow = '';
  body.style.paddingRight = '';
  body.style.paddingLeft = '';
  body.removeAttribute('data-inert');
  body.removeAttribute('data-scroll-lock');
  if (body.getAttribute('style') === '') body.removeAttribute('style');

  hiddenElements(doc).forEach((element) => {
    element.removeAttribute('aria-hidden');
    element.removeAttribute('data-aria-hidden');
  });
}

/**
 * Clears the barriers only once nothing is on screen to justify them. zag sets
 * them from a microtask and removes the layer DOM after the exit animation, so
 * the check is deferred by two frames and re-verified before acting — a modal
 * that is merely mid-transition must never be torn down.
 */
export function useModalLayerRecovery(): void {
  useEffect(() => {
    const doc = document;
    let pending = 0;

    const verifyAndClear = () => {
      pending = 0;
      if (hasOpenLayer(doc)) return;
      if (!hasLeakedBarrier(doc)) return;
      clearLeakedBarrier(doc);
    };

    const schedule = () => {
      if (pending) return;
      // Two frames: one for zag's microtask, one for the exit animation commit.
      pending = requestAnimationFrame(() => {
        pending = requestAnimationFrame(verifyAndClear);
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(doc.body, {
      attributes: true,
      attributeFilter: ['style', 'data-inert', 'data-scroll-lock'],
      childList: true,
    });

    schedule();

    return () => {
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);
}
