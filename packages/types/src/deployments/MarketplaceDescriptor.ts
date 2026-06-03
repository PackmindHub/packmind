import { UserId } from '../accounts/User';
import { MarketplaceVendor } from './MarketplaceVendor';
import { PluginRef } from './PluginRef';

/**
 * Metadata Packmind writes back into the descriptor for every plugin it
 * manages on a marketplace. The lock is the canonical state Packmind
 * compares against on subsequent publishes (drift detection, idempotency)
 * and the marker that distinguishes a Packmind-managed plugin from an
 * unmanaged one (used by the name-collision check).
 */
export type MarketplaceDescriptorPackmindLockEntry = {
  version: string;
  contentHash: string;
  lastPublishedAt: string;
  lastPublishedBy: UserId;
};

export type MarketplaceDescriptorPackmindLock = {
  schemaVersion: 1;
  plugins: Record<string, MarketplaceDescriptorPackmindLockEntry>;
};

/**
 * Normalized representation of a marketplace descriptor file (e.g.
 * `marketplace.json`) once parsed by a vendor-specific parser.
 *
 * `raw` preserves the original JSON object so the reconciliation job can
 * deep-compare against future fetches without re-parsing.
 *
 * `packmindLock` is forward-compatible: when omitted, the descriptor has
 * never been touched by Packmind (first publish for any plugin).
 */
export type MarketplaceDescriptor = {
  vendor: MarketplaceVendor;
  name: string;
  version?: string;
  plugins: PluginRef[];
  packmindLock?: MarketplaceDescriptorPackmindLock;
  raw: unknown;
};
