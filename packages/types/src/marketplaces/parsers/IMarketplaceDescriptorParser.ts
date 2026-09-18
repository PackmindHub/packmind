import { MarketplaceDescriptor } from '../MarketplaceDescriptor';
import { MarketplaceVendor } from '../MarketplaceVendor';

/**
 * Strategy contract implemented by every vendor-specific marketplace
 * descriptor parser.
 *
 * The `MarketplaceDescriptorParserRegistry` iterates registered parsers in
 * priority order and delegates to the first parser whose `canParse` returns
 * true. Implementations must throw `MarketplaceDescriptorParseError` when
 * `parse` is called on a structurally invalid descriptor.
 *
 * The registry also supports vendor-certain dispatch (`parseForVendor`) for
 * callers that already know which vendor produced the content — typically
 * because they fetched it from a vendor-specific path. `vendor` lets that
 * dispatch find the right parser instance directly, without relying on
 * `canParse`'s content-shape guessing.
 */
export interface IMarketplaceDescriptorParser {
  readonly vendor: MarketplaceVendor;

  /** `rawJson` is already JSON-parsed, not a string. */
  canParse(rawJson: unknown): boolean;

  /** Must throw `MarketplaceDescriptorParseError` on validation failures. */
  parse(rawJson: unknown): MarketplaceDescriptor;
}
