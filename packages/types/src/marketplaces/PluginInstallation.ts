import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { WithSoftDelete, WithTimestamps } from '../database/types';
import { MarketplaceId } from './MarketplaceId';
import { PackageId } from '../deployments/Package';
import { PluginInstallationId } from './PluginInstallationId';

/**
 * Scope at which a Packmind plugin is enabled in the coding agent.
 *
 * Both agents expose the same three-rung ladder, so the values are shared:
 *
 * | Scope     | Claude Code                        | GitHub Copilot CLI                             |
 * |-----------|------------------------------------|------------------------------------------------|
 * | `local`   | `.claude/settings.local.json`      | `.github/copilot/settings.local.json`           |
 * | `project` | `.claude/settings.json`            | `.github/copilot/settings.json`                 |
 * | `user`    | `~/.claude/settings.json`          | `~/.copilot/settings.json`                      |
 */
export type PluginInstallScope = 'user' | 'project' | 'local';

/**
 * Coding agent whose session produced the heartbeat.
 *
 * NOT NULL with `claude-code` as the default: every row written before Copilot
 * tracking shipped came from a Claude Code session, and the heartbeat UNIQUE
 * index includes this column — a nullable value would defeat the index, since
 * Postgres treats NULLs as distinct.
 */
export type PluginInstallAgent = 'claude-code' | 'copilot-cli';

/**
 * Where the pseudonymous identity was derived from.
 *
 * - `claude-account` — the signed-in account email in `~/.claude.json`.
 * - `git-config`     — `git config user.email`. Copilot CLI keeps its
 *   credentials in the OS keychain and its `~/.copilot/config.json` carries no
 *   account information, so the git commit identity is the only local signal.
 *
 * The two are different people-axes for the same human: the same person shows
 * up under two hashes, hence two rows. Carrying the source keeps that visible
 * in the UI instead of silently presenting one as the other.
 */
export type PluginInstallIdentitySource = 'claude-account' | 'git-config';

/**
 * Heartbeat record: evidence that a plugin was active in a coding-agent session.
 *
 * Each row represents a unique (marketplace, pluginSlug, scope, agent, identityKey,
 * repoKey) combination. The UNIQUE index on those six columns collapses repeated heartbeats
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
    /**
     * Content revision the heartbeat reported as installed, read from the
     * tracking sidecar (`PACKMIND_PLUGIN_REVISION`) baked at publish. Refreshed
     * to the latest reported value on every heartbeat. Compared by equality
     * against the published distribution revision to classify the install as
     * up-to-date or outdated. `null` for installs of plugins published before
     * this shipped, or whose sidecar carried no revision (→ outdated).
     */
    installedRevision: string | null;
    scope: PluginInstallScope;
    /** Coding agent that reported the heartbeat. Part of the heartbeat key. */
    agent: PluginInstallAgent;
    /**
     * Which local signal `anonymousIdHash` / `anonymousEmailMasked` were derived
     * from. `null` for rows created before this shipped, and for rows with no
     * anonymous identity at all.
     */
    identitySource: PluginInstallIdentitySource | null;
    /** Set only when the API-key JWT was verified against the token's org. */
    userId: UserId | null;
    /** SHA-256 hash of the lowercased identity email (pseudonymous dedup key). */
    anonymousIdHash: string | null;
    /** Masked display form of the identity email, e.g. `b**.s***@acme.com`. */
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
