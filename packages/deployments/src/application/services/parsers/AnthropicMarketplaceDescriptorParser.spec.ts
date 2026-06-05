import { MarketplaceDescriptorParseError } from '../../../domain/errors';
import { AnthropicMarketplaceDescriptorParser } from './AnthropicMarketplaceDescriptorParser';

describe('AnthropicMarketplaceDescriptorParser', () => {
  let parser: AnthropicMarketplaceDescriptorParser;

  beforeEach(() => {
    parser = new AnthropicMarketplaceDescriptorParser();
  });

  describe('canParse', () => {
    describe('when the raw object has the anthropic-shaped plugins array', () => {
      describe('when no vendor field is present', () => {
        it('returns true', () => {
          const raw = { name: 'demo', plugins: [{ name: 'plugin-a' }] };

          expect(parser.canParse(raw)).toBe(true);
        });
      });

      describe('when vendor is explicitly anthropic', () => {
        it('returns true', () => {
          const raw = {
            vendor: 'anthropic',
            name: 'demo',
            plugins: [{ name: 'plugin-a' }],
          };

          expect(parser.canParse(raw)).toBe(true);
        });
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
      describe('when plugins is missing', () => {
        it('returns false', () => {
          expect(parser.canParse({ name: 'demo' })).toBe(false);
        });
      });

      describe('when plugins is not an array', () => {
        it('returns false', () => {
          expect(parser.canParse({ name: 'demo', plugins: {} })).toBe(false);
        });
      });

      it('returns false for null', () => {
        expect(parser.canParse(null)).toBe(false);
      });

      describe('for a non-object primitive', () => {
        it('returns false for a string', () => {
          expect(parser.canParse('a string')).toBe(false);
        });

        it('returns false for a number', () => {
          expect(parser.canParse(42)).toBe(false);
        });

        it('returns false for undefined', () => {
          expect(parser.canParse(undefined)).toBe(false);
        });
      });

      it('returns false for a top-level array', () => {
        expect(parser.canParse([{ name: 'demo', plugins: [] }])).toBe(false);
      });
    });
  });

  describe('parse', () => {
    describe('with a valid descriptor', () => {
      describe('returns a normalized MarketplaceDescriptor with vendor=anthropic', () => {
        const raw = {
          name: 'Acme Marketplace',
          version: '1.2.0',
          plugins: [
            { name: 'Plugin A' },
            { name: 'Plugin B', version: '2.0.0' },
          ],
        };

        let result: ReturnType<AnthropicMarketplaceDescriptorParser['parse']>;

        beforeEach(() => {
          result = parser.parse(raw);
        });

        it('sets the vendor to anthropic', () => {
          expect(result.vendor).toBe('anthropic');
        });

        it('preserves the name', () => {
          expect(result.name).toBe('Acme Marketplace');
        });

        it('preserves the version', () => {
          expect(result.version).toBe('1.2.0');
        });

        it('normalizes the plugins with slugs', () => {
          expect(result.plugins).toEqual([
            { slug: 'plugin-a', name: 'Plugin A' },
            { slug: 'plugin-b', name: 'Plugin B', version: '2.0.0' },
          ]);
        });

        it('exposes the original raw object', () => {
          expect(result.raw).toBe(raw);
        });
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

      describe('when the descriptor does not declare a version', () => {
        it('omits version', () => {
          const raw = { name: 'demo', plugins: [{ name: 'plugin-a' }] };

          const result = parser.parse(raw);

          expect(result.version).toBeUndefined();
        });
      });

      describe('when a plugin entry declares a source block', () => {
        const raw = {
          name: 'demo',
          plugins: [
            {
              name: 'plugin-a',
              version: '0.1.0',
              source: {
                source: 'git-subdir',
                url: 'https://github.com/test-org/test-marketplace.git',
                path: 'plugins/plugin-a',
              },
            },
          ],
        };

        it('reads the source block back into the normalized PluginRef', () => {
          const result = parser.parse(raw);

          expect(result.plugins[0]).toEqual({
            slug: 'plugin-a',
            name: 'plugin-a',
            version: '0.1.0',
            source: {
              source: 'git-subdir',
              url: 'https://github.com/test-org/test-marketplace.git',
              path: 'plugins/plugin-a',
            },
          });
        });
      });

      describe('when a plugin entry has no source block (legacy)', () => {
        it('parses it with source undefined', () => {
          const raw = {
            name: 'demo',
            plugins: [{ name: 'plugin-a', version: '0.1.0' }],
          };

          const result = parser.parse(raw);

          expect(result.plugins[0].source).toBeUndefined();
        });
      });
    });

    describe('when a required field is missing', () => {
      describe('when name is missing', () => {
        const raw = { plugins: [{ name: 'plugin-a' }] };

        let thrown: unknown;

        beforeEach(() => {
          thrown = undefined;
          try {
            parser.parse(raw);
          } catch (error) {
            thrown = error;
          }
        });

        it('throws MarketplaceDescriptorParseError', () => {
          expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
        });

        it('defines a cause on the error', () => {
          expect(
            (thrown as MarketplaceDescriptorParseError).cause,
          ).toBeDefined();
        });

        it('exposes the cause as an array', () => {
          expect(
            Array.isArray((thrown as MarketplaceDescriptorParseError).cause),
          ).toBe(true);
        });
      });

      describe('when a plugin has no name', () => {
        it('throws MarketplaceDescriptorParseError', () => {
          const raw = { name: 'demo', plugins: [{ version: '1.0.0' }] };

          expect(() => parser.parse(raw)).toThrow(
            MarketplaceDescriptorParseError,
          );
        });
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
