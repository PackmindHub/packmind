import { getPasswordSaltRounds } from './passwordHashing';

describe('getPasswordSaltRounds', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  describe('when NODE_ENV is test', () => {
    it('returns the cheap cost factor', () => {
      process.env['NODE_ENV'] = 'test';

      expect(getPasswordSaltRounds()).toBe(4);
    });
  });

  describe('when NODE_ENV is production', () => {
    it('returns the strong cost factor', () => {
      process.env['NODE_ENV'] = 'production';

      expect(getPasswordSaltRounds()).toBe(10);
    });
  });

  describe('when NODE_ENV is not set', () => {
    it('returns the strong cost factor', () => {
      delete process.env['NODE_ENV'];

      expect(getPasswordSaltRounds()).toBe(10);
    });
  });

  describe('when NODE_ENV is an unknown value', () => {
    it('returns the strong cost factor', () => {
      process.env['NODE_ENV'] = 'staging';

      expect(getPasswordSaltRounds()).toBe(10);
    });
  });
});
