import { MarketplaceDescriptorParseError } from '../../../domain/errors';
import { AnthropicMarketplaceDescriptorParser } from './AnthropicMarketplaceDescriptorParser';

describe('AnthropicMarketplaceDescriptorParser', () => {
  let parser: AnthropicMarketplaceDescriptorParser;

  beforeEach(() => {
    parser = new AnthropicMarketplaceDescriptorParser();
  });

  describe('canParse', () => {
    describe('when the raw object has the anthropic-shaped plugins array', () => {
      it('returns true when no vendor field is present', () => {
        const raw = { name: 'demo', plugins: [{ name: 'plugin-a' }] };

        expect(parser.canParse(raw)).toBe(true);
      });

      it('returns true when vendor is explicitly anthropic', () => {
        const raw = {
          vendor: 'anthropic',
          name: 'demo',
          plugins: [{ name: 'plugin-a' }],
        };

        expect(parser.canParse(raw)).toBe(true);
      });
    });

    describe('when a foreign vendor is declared', () => {
      it('declines to claim the descriptor', () => {
        const raw = {
          vendor: 'copilot',
          name: 'demo',
          plugins: [{ name: 'plugin-a' }],
        };

        expect(parser.canParse(raw)).toBe(false);
      });
    });

    describe('when the shape is structurally foreign', () => {
      it('returns false when plugins is missing', () => {
        expect(parser.canParse({ name: 'demo' })).toBe(false);
      });

      it('returns false when plugins is not an array', () => {
        expect(parser.canParse({ name: 'demo', plugins: {} })).toBe(false);
      });

      it('returns false for null', () => {
        expect(parser.canParse(null)).toBe(false);
      });

      it('returns false for a non-object primitive', () => {
        expect(parser.canParse('a string')).toBe(false);
        expect(parser.canParse(42)).toBe(false);
        expect(parser.canParse(undefined)).toBe(false);
      });

      it('returns false for a top-level array', () => {
        expect(parser.canParse([{ name: 'demo', plugins: [] }])).toBe(false);
      });
    });
  });

  describe('parse', () => {
    describe('with a valid descriptor', () => {
      it('returns a normalized MarketplaceDescriptor with vendor=anthropic', () => {
        const raw = {
          name: 'Acme Marketplace',
          version: '1.2.0',
          plugins: [
            { name: 'Plugin A' },
            { name: 'Plugin B', version: '2.0.0' },
          ],
        };

        const result = parser.parse(raw);

        expect(result.vendor).toBe('anthropic');
        expect(result.name).toBe('Acme Marketplace');
        expect(result.version).toBe('1.2.0');
        expect(result.plugins).toEqual([
          { slug: 'plugin-a', name: 'Plugin A' },
          { slug: 'plugin-b', name: 'Plugin B', version: '2.0.0' },
        ]);
        expect(result.raw).toBe(raw);
      });

      it('preserves unknown top-level + plugin fields on raw', () => {
        const raw = {
          name: 'demo',
          plugins: [{ name: 'plugin-a', description: 'Does things' }],
          metadata: { author: 'Acme' },
        };

        const result = parser.parse(raw);

        expect(result.raw).toBe(raw);
      });

      it('omits version when the descriptor does not declare one', () => {
        const raw = { name: 'demo', plugins: [{ name: 'plugin-a' }] };

        const result = parser.parse(raw);

        expect(result.version).toBeUndefined();
      });
    });

    describe('when a required field is missing', () => {
      it('throws MarketplaceDescriptorParseError when name is missing', () => {
        const raw = { plugins: [{ name: 'plugin-a' }] };

        let thrown: unknown;
        try {
          parser.parse(raw);
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
        expect((thrown as MarketplaceDescriptorParseError).cause).toBeDefined();
        expect(
          Array.isArray((thrown as MarketplaceDescriptorParseError).cause),
        ).toBe(true);
      });

      it('throws MarketplaceDescriptorParseError when a plugin has no name', () => {
        const raw = { name: 'demo', plugins: [{ version: '1.0.0' }] };

        expect(() => parser.parse(raw)).toThrow(
          MarketplaceDescriptorParseError,
        );
      });
    });

    describe('when the descriptor was passed as a JSON string (malformed input)', () => {
      it('throws MarketplaceDescriptorParseError because parse expects an object', () => {
        // The registry is responsible for JSON.parse — passing a raw string
        // here represents a misuse / malformed-input scenario.
        const raw = '{"name":"demo","plugins":[]}';

        expect(() => parser.parse(raw)).toThrow(
          MarketplaceDescriptorParseError,
        );
      });
    });
  });
});
