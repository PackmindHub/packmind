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
    describe('when requesting a valid language', () => {
      let parser: Awaited<ReturnType<ParserRegistry['getParser']>>;

      beforeEach(async () => {
        parser = await registry.getParser('typescript');
      });

      it('returns a defined parser instance', () => {
        expect(parser).toBeDefined();
      });

      it('returns a parser with the correct language', () => {
        expect(parser.getLanguage()).toBe('typescript');
      });
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

    describe('when initializing parser on first access', () => {
      let parser: Awaited<ReturnType<ParserRegistry['getParser']>>;

      beforeEach(async () => {
        parser = await registry.getParser('javascript');
      });

      it('returns a defined parser instance', () => {
        expect(parser).toBeDefined();
      });

      it('returns a parser with the correct language', () => {
        expect(parser.getLanguage()).toBe('javascript');
      });
    });
  });

  describe('getAvailableParsers', () => {
    describe('when retrieving available parsers', () => {
      let available: string[];

      beforeEach(() => {
        available = registry.getAvailableParsers();
      });

      it('returns an array', () => {
        expect(Array.isArray(available)).toBe(true);
      });

      it('returns a non-empty array', () => {
        expect(available.length).toBeGreaterThan(0);
      });
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
