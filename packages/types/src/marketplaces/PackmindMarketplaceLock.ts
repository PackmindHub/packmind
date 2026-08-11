import { UserId } from '../accounts/User';

/**
 * Filename of the standalone Packmind marketplace lock file. The file is
 * always located at the marketplace repository root, regardless of where
 * the vendor descriptor (e.g. `marketplace.json`) lives.
 *
 * Single source of truth for the filename. Re-exported as a path constant
 * by `packages/deployments/src/application/services/packmindMarketplaceLock.ts`.
 */
export const PACKMIND_MARKETPLACE_LOCK_FILENAME = 'packmind-lock.json';

/**
 * Per-plugin lock entry. Captures the canonical Packmind-managed state for
 * a single plugin slug on the marketplace — used for drift detection,
 * idempotency on republish, and to mark the slug as Packmind-managed (i.e.
 * exempt from the unmanaged-name-collision check).
 */
export type PackmindMarketplaceLockPluginEntry = {
  version: string;
  contentHash: string;
  /** ISO-8601 timestamp of the last successful publish for this slug. */
  lastPublishedAt: string;
  lastPublishedBy: UserId;
};

/**
 * Top-level shape of the standalone Packmind marketplace lock file.
 *
 * The lock is a pure plugin map — it does NOT carry marketplace identity,
 * organization identity, or any other Packmind backend metadata. Plugin
 * slugs are the only keys. Lift any future cross-cutting metadata into a
 * separate file rather than expanding this shape.
 */
export type PackmindMarketplaceLock = {
  schemaVersion: 1;
  plugins: Record<string, PackmindMarketplaceLockPluginEntry>;
};
