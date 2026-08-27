import { queryClient } from './queryClient';

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
});
