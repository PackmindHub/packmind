import { MarketplacesError } from './MarketplacesError';

/**
 * Error thrown when a marketplace descriptor parser claims the content but
 * subsequently fails to parse or validate it.
 *
 * The original error (e.g. a Zod `ZodError` or a `SyntaxError` from
 * `JSON.parse`) is carried in `cause` for diagnostics; the message is kept
 * generic for safe surfacing in API responses.
 */
export class MarketplaceDescriptorParseError extends MarketplacesError {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super('invalid_input', 'marketplace_descriptor_unparseable', {}, message);
    this.name = 'MarketplaceDescriptorParseError';
  }
}
