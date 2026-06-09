import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  IMarketplaceDescriptorParser,
  MarketplaceDescriptor,
} from '@packmind/types';
import {
  MarketplaceDescriptorParseError,
  UnknownMarketplaceDescriptorError,
} from '../../domain/errors';

const origin = 'MarketplaceDescriptorParserRegistry';

/**
 * Vendor-agnostic registry for marketplace descriptor parsers.
 *
 * Iterates the parsers it was constructed with in declaration order and
 * dispatches the raw descriptor payload to the first parser whose `canParse`
 * returns true. New parsers (e.g. Copilot, Cursor) plug in by being appended
 * to the constructor's `parsers` array; consumers (link/unlink use cases,
 * reconciliation job) do not branch on vendor.
 *
 * Error contract:
 * - `MarketplaceDescriptorParseError` — raised when the input is not valid JSON
 *   or when a claiming parser fails to parse/validate its claimed content.
 * - `UnknownMarketplaceDescriptorError` — raised when no registered parser
 *   recognises the descriptor shape.
 */
export class MarketplaceDescriptorParserRegistry {
  private readonly parsers: ReadonlyArray<IMarketplaceDescriptorParser>;

  constructor(
    parsers: IMarketplaceDescriptorParser[],
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.parsers = [...parsers];
    this.logger.info('MarketplaceDescriptorParserRegistry initialized', {
      parserCount: this.parsers.length,
    });
  }

  /**
   * Parses the raw descriptor content (the body of `marketplace.json`) into a
   * normalized `MarketplaceDescriptor`.
   *
   * @throws MarketplaceDescriptorParseError when JSON parsing or a claiming
   *   parser's validation fails.
   * @throws UnknownMarketplaceDescriptorError when no registered parser claims
   *   the content.
   */
  parse(content: string): MarketplaceDescriptor {
    const rawJson = this.parseJson(content);

    for (const parser of this.parsers) {
      if (!this.canParserClaim(parser, rawJson)) {
        continue;
      }

      try {
        return parser.parse(rawJson);
      } catch (error) {
        if (error instanceof MarketplaceDescriptorParseError) {
          throw error;
        }
        throw new MarketplaceDescriptorParseError(
          'Marketplace descriptor parser failed to validate the descriptor content',
          error,
        );
      }
    }

    this.logger.warn(
      'No registered marketplace descriptor parser claimed the content',
    );
    throw new UnknownMarketplaceDescriptorError();
  }

  private parseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new MarketplaceDescriptorParseError(
        'Marketplace descriptor content is not valid JSON',
        error,
      );
    }
  }

  private canParserClaim(
    parser: IMarketplaceDescriptorParser,
    rawJson: unknown,
  ): boolean {
    try {
      return parser.canParse(rawJson);
    } catch (error) {
      this.logger.warn(
        'Marketplace descriptor parser threw during canParse; skipping',
        { error: error instanceof Error ? error.message : String(error) },
      );
      return false;
    }
  }
}
