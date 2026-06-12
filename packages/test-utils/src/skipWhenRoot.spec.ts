import { skipWhenRoot } from './skipWhenRoot';

describe('skipWhenRoot', () => {
  const originalGetuid = process.getuid;

  afterEach(() => {
    if (originalGetuid) {
      process.getuid = originalGetuid;
    } else {
      delete (process as { getuid?: () => number }).getuid;
    }
  });

  describe('when running as root', () => {
    it('returns true', () => {
      process.getuid = () => 0;

      expect(skipWhenRoot()).toBe(true);
    });
  });

  describe('when running as a non-root user', () => {
    it('returns false', () => {
      process.getuid = () => 1000;

      expect(skipWhenRoot()).toBe(false);
    });
  });

  describe('when getuid is unavailable', () => {
    it('returns false', () => {
      delete (process as { getuid?: () => number }).getuid;

      expect(skipWhenRoot()).toBe(false);
    });
  });
});
