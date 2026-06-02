import { PatTokenResolver } from './PatTokenResolver';

describe('PatTokenResolver', () => {
  afterEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('accepts a string token without throwing', () => {
      expect(() => new PatTokenResolver('ghp_xxx')).not.toThrow();
    });
  });

  describe('getToken', () => {
    it('resolves to the token passed at construction', async () => {
      const resolver = new PatTokenResolver('ghp_xxx');
      await expect(resolver.getToken()).resolves.toBe('ghp_xxx');
    });

    it('returns the same value on repeated calls', async () => {
      const resolver = new PatTokenResolver('ghp_xxx');
      const first = await resolver.getToken();
      const second = await resolver.getToken();
      expect(first).toBe(second);
      expect(first).toBe('ghp_xxx');
    });
  });

  describe('onUnauthorized', () => {
    it('resolves without throwing', async () => {
      const resolver = new PatTokenResolver('ghp_xxx');
      await expect(resolver.onUnauthorized()).resolves.toBeUndefined();
    });

    it('does not mutate the resolved token', async () => {
      const resolver = new PatTokenResolver('ghp_xxx');
      await resolver.onUnauthorized();
      await expect(resolver.getToken()).resolves.toBe('ghp_xxx');
    });
  });

  describe('getKind', () => {
    it('reports the user kind', () => {
      const resolver = new PatTokenResolver('ghp_xxx');
      expect(resolver.getKind()).toBe('user');
    });
  });
});
