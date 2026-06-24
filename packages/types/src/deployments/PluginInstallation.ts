import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { WithSoftDelete, WithTimestamps } from '../database/types';
import { MarketplaceId } from './MarketplaceId';
import { PackageId } from './Package';
import { PluginInstallationId } from './PluginInstallationId';

/**
 * Scope at which a Packmind plugin is enabled in Claude Code.
 *
 * - `user`    — enabled in the user's global `~/.claude/settings.json`
 * - `project` — enabled in the project's committed `.claude/settings.json`
 * - `local`   — enabled in the user's uncommitted `.claude/settings.local.json`
 */
export type PluginInstallScope = 'user' | 'project' | 'local';

/**
 * Heartbeat record: evidence that a plugin was active in a Claude Code session.
 *
 * Each row represents a unique (marketplace, pluginSlug, scope, identityKey, repoKey)
 * combination. The UNIQUE index on those five columns collapses repeated heartbeats
 * into a single row. `createdAt` marks the first-seen time (preserved as the
 * earliest value on merge); `updatedAt` is bumped to the last-seen time on every
 * heartbeat.
 *
 * ### Absent-field key rule (§7.1)
 * Both `identityKey` and `repoKey` are NOT NULL — the domain guarantees a
 * non-null string. They may be empty-string (`''`) per the semantics below:
 *
 * - `identityKey` = `userId` ?? `anonymousIdHash` ?? `''`
 * - `repoKey`     = `''` when `scope === 'user'`, else the normalized `owner/repo`
 *   slug of `repoRemoteUrl` ?? the raw `repoRemoteUrl` ?? `''`
 *
 * This forces all identity-less heartbeats for the same (plugin, scope, repo)
 * into one row and lets the UNIQUE index work correctly (Postgres treats NULLs
 * as distinct, so a nullable key would defeat the index).
 */
export type PluginInstallation = WithSoftDelete<
  WithTimestamps<{
    id: PluginInstallationId;
    organizationId: OrganizationId;
    marketplaceId: MarketplaceId;
    pluginSlug: string;
    /** Best-effort resolution from `pluginSlug`; `null` when unresolvable. */
    packageId: PackageId | null;
    /**
     * Version of the plugin the heartbeat reported as installed, read from the
     * installed `.claude-plugin/plugin.json` manifest. Refreshed to the latest
     * reported value on every heartbeat. `null` for rows created before install
     * tracking captured a version, or when the version could not be resolved.
     */
    installedVersion: string | null;
    scope: PluginInstallScope;
    /** Set only when the API-key JWT was verified against the token's org. */
    userId: UserId | null;
    /** SHA-256 hash of the lowercased Claude account email (pseudonymous dedup key). */
    anonymousIdHash: string | null;
    /** Masked display form of the Claude account email, e.g. `b**.s***@acme.com`. */
    anonymousEmailMasked: string | null;
    /**
     * Computed key, NOT NULL.
     * Value: `userId ?? anonymousIdHash ?? ''`
     */
    identityKey: string;
    /**
     * Raw git remote URL, e.g. `https://github.com/acme/frontend.git`.
     * Always `null` when `scope === 'user'`: a user-scope install is global and
     * not bound to a repository, so the repo is never tracked.
     */
    repoRemoteUrl: string | null;
    /**
     * Computed key, NOT NULL.
     * Value: `''` when `scope === 'user'`, else the normalized `owner/repo` slug
     * of `repoRemoteUrl` ?? the raw `repoRemoteUrl` ?? `''`.
     */
    repoKey: string;
  }>
>;
