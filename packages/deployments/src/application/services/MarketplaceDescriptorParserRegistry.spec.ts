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
      it('returns the descriptor produced by that parser', () => {
        const claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockReturnValue(sampleDescriptor),
        });
        const fallback = buildParser();
        const registry = new MarketplaceDescriptorParserRegistry(
          [claiming, fallback],
          logger,
        );

        const result = registry.parse('{"name":"Test Marketplace"}');

        expect(result).toBe(sampleDescriptor);
        expect(claiming.parse).toHaveBeenCalledTimes(1);
        expect(fallback.canParse).not.toHaveBeenCalled();
        expect(fallback.parse).not.toHaveBeenCalled();
      });
    });

    describe('when the first parser declines but the second claims', () => {
      it('falls through to the next parser', () => {
        const declining = buildParser({
          canParse: jest.fn().mockReturnValue(false),
        });
        const claiming = buildParser({
          canParse: jest.fn().mockReturnValue(true),
          parse: jest.fn().mockReturnValue(sampleDescriptor),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [declining, claiming],
          logger,
        );

        const result = registry.parse('{"foo":"bar"}');

        expect(result).toBe(sampleDescriptor);
        expect(declining.canParse).toHaveBeenCalledTimes(1);
        expect(declining.parse).not.toHaveBeenCalled();
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
      it('wraps it in a MarketplaceDescriptorParseError carrying the cause', () => {
        const cause = new Error('boom');
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

        let thrown: unknown;
        try {
          registry.parse('{"foo":"bar"}');
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
        expect((thrown as MarketplaceDescriptorParseError).cause).toBe(cause);
      });
    });

    describe('when the input is not valid JSON', () => {
      it('throws MarketplaceDescriptorParseError without consulting parsers', () => {
        const parser = buildParser({
          canParse: jest.fn().mockReturnValue(true),
        });
        const registry = new MarketplaceDescriptorParserRegistry(
          [parser],
          logger,
        );

        expect(() => registry.parse('{ not valid json')).toThrow(
          MarketplaceDescriptorParseError,
        );
        expect(parser.canParse).not.toHaveBeenCalled();
        expect(parser.parse).not.toHaveBeenCalled();
      });

      it('preserves the underlying SyntaxError on the cause property', () => {
        const registry = new MarketplaceDescriptorParserRegistry([], logger);

        let thrown: unknown;
        try {
          registry.parse('not json at all');
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(MarketplaceDescriptorParseError);
        expect(
          (thrown as MarketplaceDescriptorParseError).cause,
        ).toBeInstanceOf(SyntaxError);
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
