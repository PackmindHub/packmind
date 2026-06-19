import { stubLogger } from '@packmind/test-utils';
import {
  IMarketplaceDescriptorParser,
  MarketplaceDescriptor,
} from '@packmind/types';
import {
  MarketplaceDescriptorParseError,
  UnknownMarketplaceDescriptorError,
} from '../../domain/errors';
import { MarketplaceDescriptorParserRegistry } from './MarketplaceDescriptorParserRegistry';

const sampleDescriptor: MarketplaceDescriptor = {
  vendor: 'anthropic',
  name: 'Test Marketplace',
  plugins: [{ slug: 'plugin-a', name: 'Plugin A' }],
  raw: { name: 'Test Marketplace', plugins: [{ name: 'Plugin A' }] },
};

const buildParser = (
  overrides: Partial<IMarketplaceDescriptorParser> = {},
): jest.Mocked<IMarketplaceDescriptorParser> => ({
  canParse: jest.fn().mockReturnValue(false),
  parse: jest.fn().mockReturnValue(sampleDescriptor),
  ...overrides,
});

describe('MarketplaceDescriptorParserRegistry', () => {
  let logger: ReturnType<typeof stubLogger>;

  beforeEach(() => {
    logger = stubLogger();
  });

  describe('parse', () => {
    describe('when the first registered parser claims the content', () => {
      let claiming: jest.Mocked<IMarketplaceDescriptorParser>;
      let fallback: jest.Mocked<IMarketplaceDescriptorParser>;
      let result: MarketplaceDescriptor;

      beforeEach(() => {
        claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockReturnValue(sampleDescriptor),
        });
        fallback = buildParser();
        const registry = new MarketplaceDescriptorParserRegistry(
          [claiming, fallback],
          logger,
        );

        result = registry.parse('{"name":"Test Marketplace"}');
      });

      it('returns the descriptor produced by that parser', () => {
        expect(result).toBe(sampleDescriptor);
      });

      it('invokes the claiming parser once', () => {
        expect(claiming.parse).toHaveBeenCalledTimes(1);
      });

      it('does not consult the fallback parser', () => {
        expect(fallback.canParse).not.toHaveBeenCalled();
      });

      it('does not parse with the fallback parser', () => {
        expect(fallback.parse).not.toHaveBeenCalled();
      });
    });

    describe('when the first parser declines but the second claims', () => {
      let declining: jest.Mocked<IMarketplaceDescriptorParser>;
      let claiming: jest.Mocked<IMarketplaceDescriptorParser>;
      let result: MarketplaceDescriptor;

      beforeEach(() => {
        declining = buildParser({
          canParse: jest.fn().mockReturnValue(false),
        });
        claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockReturnValue(sampleDescriptor),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [declining, claiming],
          logger,
        );

        result = registry.parse('{"foo":"bar"}');
      });

      it('falls through to the next parser', () => {
        expect(result).toBe(sampleDescriptor);
      });

      it('consults the declining parser once', () => {
        expect(declining.canParse).toHaveBeenCalledTimes(1);
      });

      it('does not parse with the declining parser', () => {
        expect(declining.parse).not.toHaveBeenCalled();
      });

      it('parses with the claiming parser once', () => {
        expect(claiming.parse).toHaveBeenCalledTimes(1);
      });
    });

    describe('when no parser claims the content', () => {
      it('throws UnknownMarketplaceDescriptorError', () => {
        const registry = new MarketplaceDescriptorParserRegistry(
          [buildParser(), buildParser()],
          logger,
        );

        expect(() => registry.parse('{"foo":"bar"}')).toThrow(
          UnknownMarketplaceDescriptorError,
        );
      });
    });

    describe('when no parsers are registered', () => {
      it('throws UnknownMarketplaceDescriptorError', () => {
        const registry = new MarketplaceDescriptorParserRegistry([], logger);

        expect(() => registry.parse('{}')).toThrow(
          UnknownMarketplaceDescriptorError,
        );
      });
    });

    describe('when a claiming parser throws MarketplaceDescriptorParseError', () => {
      it('propagates the original error untouched', () => {
        const cause = { issues: ['missing name'] };
        const parseError = new MarketplaceDescriptorParseError(
          'Invalid descriptor',
          cause,
        );
        const claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockImplementation(() => {
            throw parseError;
          }),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [claiming],
          logger,
        );

        let thrown: unknown;
        try {
          registry.parse('{"foo":"bar"}');
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBe(parseError);
      });
    });

    describe('when a claiming parser throws an unexpected error', () => {
      let cause: Error;
      let thrown: unknown;

      beforeEach(() => {
        cause = new Error('boom');
        const claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockImplementation(() => {
            throw cause;
          }),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [claiming],
          logger,
        );

        try {
          registry.parse('{"foo":"bar"}');
        } catch (error) {
          thrown = error;
        }
      });

      it('wraps it in a MarketplaceDescriptorParseError', () => {
        expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
      });

      it('carries the original error as the cause', () => {
        expect((thrown as MarketplaceDescriptorParseError).cause).toBe(cause);
      });
    });

    describe('when the input is not valid JSON', () => {
      describe('without consulting parsers', () => {
        let parser: jest.Mocked<IMarketplaceDescriptorParser>;
        let registry: MarketplaceDescriptorParserRegistry;

        beforeEach(() => {
          parser = buildParser({
            canParse: jest.fn().mockReturnValue(true),
          });
          registry = new MarketplaceDescriptorParserRegistry([parser], logger);
        });

        it('throws MarketplaceDescriptorParseError', () => {
          expect(() => registry.parse('{ not valid json')).toThrow(
            MarketplaceDescriptorParseError,
          );
        });

        it('does not consult canParse on any parser', () => {
          try {
            registry.parse('{ not valid json');
          } catch {
            // expected
          }

          expect(parser.canParse).not.toHaveBeenCalled();
        });

        it('does not call parse on any parser', () => {
          try {
            registry.parse('{ not valid json');
          } catch {
            // expected
          }

          expect(parser.parse).not.toHaveBeenCalled();
        });
      });

      describe('with no parsers registered', () => {
        let thrown: unknown;

        beforeEach(() => {
          const registry = new MarketplaceDescriptorParserRegistry([], logger);

          try {
            registry.parse('not json at all');
          } catch (error) {
            thrown = error;
          }
        });

        it('throws a MarketplaceDescriptorParseError', () => {
          expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
        });

        it('preserves the underlying SyntaxError on the cause property', () => {
          expect(
            (thrown as MarketplaceDescriptorParseError).cause,
          ).toBeInstanceOf(SyntaxError);
        });
      });
    });

    describe('when a parser throws during canParse', () => {
      it('skips that parser and continues with the next', () => {
        const throwing = buildParser({
          canParse: jest.fn().mockImplementation(() => {
            throw new Error('canParse blew up');
          }),
        });
        const claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockReturnValue(sampleDescriptor),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [throwing, claiming],
          logger,
        );

        const result = registry.parse('{"foo":"bar"}');

        expect(result).toBe(sampleDescriptor);
      });
    });
  });
});
