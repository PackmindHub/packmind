import { focusManager } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { PackmindError } from '../../services/api/errors/PackmindError';

function answered(status: number): PackmindError {
  return new PackmindError({
    data: { message: `answered ${status}` },
    status,
    statusText: 'answered',
  });
}

function queryRetry(): (failureCount: number, error: unknown) => boolean {
  const { retry } = queryClient.getDefaultOptions().queries ?? {};
  if (typeof retry !== 'function') {
    throw new Error('The query default retry is expected to be a predicate');
  }
  return retry;
}

describe('shared queryClient', () => {
  describe('mutation defaults', () => {
    // Regression guard. A non-zero mutation retry re-sends writes the server may
    // already have applied — a failed marketplace publish was observed firing
    // POST /publish twice — and, because query-core parks a retry while the tab
    // is hidden or offline without any timeout, it can also leave `mutateAsync`
    // permanently unsettled and the calling UI spinning with no error shown.
    it('does not retry mutations', () => {
      const { retry } = queryClient.getDefaultOptions().mutations ?? {};

      expect(retry ?? 0).toBe(0);
    });
  });

  describe('query defaults', () => {
    it('does not retry an answer the server will repeat', () => {
      expect(queryRetry()(0, answered(404))).toBe(false);
    });

    it('retries a server failure', () => {
      expect(queryRetry()(0, answered(503))).toBe(true);
    });

    /*
     * The budget, asserted because raising it is what broke the suite once.
     * Every attempt is paid for on `HydrateFallback` by a reader who cannot
     * tell a slow loader from a hung one, and query-core's backoff doubles each
     * time. `retryPolicy.ts` says what three attempts cost.
     */
    it('retries a server failure once', () => {
      expect(queryRetry()(1, answered(503))).toBe(false);
    });

    /*
     * The reason the case above matters, and the reason it is asserted through
     * `fetchQuery` rather than only on the predicate.
     *
     * query-core parks a retry whose `focusManager.isFocused()` gate is closed,
     * in a promise with no timeout. With any retry allowed on a 404, this test
     * does not fail: it hangs until the runner's timeout, which is exactly what
     * the app did on a skill slug from another space, sitting on the hydrate
     * fallback with nothing in the console and one request in the network panel.
     */
    describe('when nobody is looking at the tab', () => {
      beforeEach(() => {
        focusManager.setFocused(false);
      });

      afterEach(() => {
        focusManager.setFocused(undefined);
        queryClient.clear();
      });

      it('settles an answer the server will repeat', async () => {
        await expect(
          queryClient.fetchQuery({
            queryKey: ['hidden-tab', 'not-found'],
            queryFn: () => Promise.reject(answered(404)),
          }),
        ).rejects.toBeInstanceOf(PackmindError);
      });
    });
  });
});
