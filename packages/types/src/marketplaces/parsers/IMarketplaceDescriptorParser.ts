import { MarketplaceDescriptor } from '../MarketplaceDescriptor';

/**
 * Strategy contract implemented by every vendor-specific marketplace
 * descriptor parser.
 *
 * The `MarketplaceDescriptorParserRegistry` iterates registered parsers in
 * priority order and delegates to the first parser whose `canParse` returns
 * true. Implementations must throw `MarketplaceDescriptorParseError` when
 * `parse` is called on a structurally invalid descriptor.
 */
export interface IMarketplaceDescriptorParser {
  /**
   * Returns true when this parser claims responsibility for the given raw
   * (already JSON-parsed) descriptor object.
   */
  canParse(rawJson: unknown): boolean;

  /**
   * Converts the raw descriptor into the normalized `MarketplaceDescriptor`
   * shape. Throws `MarketplaceDescriptorParseError` on validation failures.
   */
  parse(rawJson: unknown): MarketplaceDescriptor;
}
