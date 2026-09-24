import {
  deriveConnectionStatus,
  describeFailure,
  toStatusBucket,
} from './connectionStatus';

describe('connectionStatus', () => {
  describe('when the probe reports an unreadable token', () => {
    const view = deriveConnectionStatus(
      {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: { ok: false, reason: 'token_unreadable' },
      },
      { hasAuth: true },
    );

    it('uses the token unreadable bucket', () => {
      expect(toStatusBucket(view)).toBe('token_unreadable');
    });

    it('asks the user to re-authenticate', () => {
      expect(describeFailure(view)).toMatch(/Re-authenticate/);
    });
  });

  describe('when the probe reports an unauthorized token', () => {
    it('uses the token expired bucket', () => {
      expect(toStatusBucket({ kind: 'failing', reason: 'unauthorized' })).toBe(
        'token_expired',
      );
    });
  });
});
