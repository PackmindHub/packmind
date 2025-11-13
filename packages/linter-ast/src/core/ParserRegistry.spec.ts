import { ParserRegistry } from './ParserRegistry';
import { ParserNotAvailableError } from './ParserError';

// Skip these tests as they require WASM files which are not available in test environment
describe.skip('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getParser', () => {
    it('returns a parser instance for a valid language', async () => {
      const parser = await registry.getParser('typescript');

      expect(parser).toBeDefined();
      expect(parser.getLanguage()).toBe('typescript');
    });

    it('caches parser instances', async () => {
      const parser1 = await registry.getParser('typescript');
      const parser2 = await registry.getParser('typescript');

      expect(parser1).toBe(parser2);
    });

    it('throws ParserNotAvailableError for invalid language', async () => {
      await expect(registry.getParser('invalid')).rejects.toThrow(
        ParserNotAvailableError,
      );
    });

    it('initializes parser on first access', async () => {
      const parser = await registry.getParser('javascript');

      expect(parser).toBeDefined();
      expect(parser.getLanguage()).toBe('javascript');
    });
  });

  describe('getAvailableParsers', () => {
    it('returns array of available parser languages', () => {
      const available = registry.getAvailableParsers();

      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });

    it('includes typescript in available parsers', () => {
      const available = registry.getAvailableParsers();

      expect(available).toContain('typescript');
    });
  });

  describe('clearCache', () => {
    it('clears cached parser instances', async () => {
      const parser1 = await registry.getParser('typescript');
      registry.clearCache();
      const parser2 = await registry.getParser('typescript');

      expect(parser1).not.toBe(parser2);
    });
  });
});
