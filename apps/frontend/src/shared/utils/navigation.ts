/**
 * Performs a full-page navigation to the given URL.
 *
 * Wrapping `window.location.assign` behind a function gives tests a mockable
 * seam: jsdom's `window.location` is `[Unforgeable]` and cannot be redefined or
 * spied on, so components that navigate directly are otherwise untestable.
 */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
