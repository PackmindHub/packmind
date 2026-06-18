import { IsNull, Not, Repository } from 'typeorm';
import {
  MarketplaceId,
  PluginInstallation,
  PluginInstallationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource } from '@packmind/node-utils';
import {
  IPluginInstallationRepository,
  UpsertHeartbeatInput,
  UpsertHeartbeatResult,
} from '../../domain/repositories/IPluginInstallationRepository';
import { PluginInstallationSchema } from '../schemas/PluginInstallationSchema';

const origin = 'PluginInstallationRepository';

/**
 * Normalizes a raw git remote URL to an `owner/repo` slug.
 *
 * Handles:
 * - HTTPS: `https://github.com/owner/repo.git`
 * - SSH:   `git@github.com:owner/repo.git`
 *
 * Returns `null` when the URL cannot be normalized.
 */
export function normalizeRepoSlug(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) {
    return null;
  }
  const trimmed = rawUrl.trim();

  // SSH form: git@<host>:<owner>/<repo>[.git]
  const sshMatch = trimmed.match(/^git@[^:]+:([^/]+\/.+?)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  // HTTPS form: https://<host>/<owner>/<repo>[.git]
  try {
    const url = new URL(trimmed);
    const parts = url.pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    // Intentional: malformed URL falls through to null
  }

  return null;
}

/**
 * Computes the `identityKey` from the raw identity fields.
 * NOT NULL rule: `userId ?? anonymousIdHash ?? ''`
 */
function computeIdentityKey(
  userId: string | null,
  anonymousIdHash: string | null,
): string {
  return userId ?? anonymousIdHash ?? '';
}

/**
 * Computes the `repoKey` from scope + the raw repo remote URL.
 * NOT NULL rule: `''` for user scope; else the normalized `owner/repo` slug
 * of `repoRemoteUrl` ?? the raw `repoRemoteUrl` ?? `''`.
 */
function computeRepoKey(
  scope: PluginInstallation['scope'],
  repoRemoteUrl: string | null,
): string {
  if (scope === 'user') {
    return '';
  }
  return normalizeRepoSlug(repoRemoteUrl) ?? repoRemoteUrl ?? '';
}

/**
 * Computes the stored `repoRemoteUrl`. A user-scope install is global and not
 * bound to a repository — the repo the user happened to be in when the
 * heartbeat fired is incidental and must not be tracked, so it is dropped to
 * `null` regardless of what the client sent.
 */
function computeRepoRemoteUrl(
  scope: PluginInstallation['scope'],
  repoRemoteUrl: string | null,
): string | null {
  if (scope === 'user') {
    return null;
  }
  return repoRemoteUrl;
}

/**
 * TypeORM-backed implementation of `IPluginInstallationRepository`.
 *
 * Implements heartbeat-upsert semantics including the anonymous→attributed
 * identity upgrade and the two merge edge cases defined in spec §7.1.
 *
 * `createdAt` (first-seen) and `updatedAt` (last-seen) are managed explicitly
 * here — the schema declares them as plain columns rather than TypeORM
 * create/update-date columns, since the QueryBuilder updates below would
 * otherwise bypass `@UpdateDateColumn`.
 */
export class PluginInstallationRepository implements IPluginInstallationRepository {
  protected readonly logger: PackmindLogger;

  constructor(
    private readonly repository: Repository<PluginInstallation> = localDataSource.getRepository<PluginInstallation>(
      PluginInstallationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger = logger;
    this.logger.info('PluginInstallationRepository initialized');
  }

  /**
   * Insert or update a heartbeat row implementing spec §7.1 upsert logic.
   *
   * Decision tree:
   * 1. Attributed heartbeat (userId provided):
   *    a. Look for an existing attributed row keyed by userId.
   *    b. Look for an anonymous row keyed by anonymousIdHash (upgrade candidate).
   *    c. **Edge case 1** — both rows exist: merge (keep earliest createdAt,
   *       update attributed updatedAt, hard-delete anonymous row).
   *    d. **Upgrade** — only anonymous row exists: promote it in-place to userId.
   *    e. **Normal** — only attributed row exists: bump updatedAt.
   *    f. No row: insert new attributed row.
   *
   * 2. Anonymous heartbeat (no userId):
   *    a. **Edge case 2** — an attributed row already carries the same
   *       anonymousIdHash: bump that row's updatedAt (don't insert duplicate).
   *    b. Normal upsert on identityKey = anonymousIdHash ?? ''.
   */
  async upsertHeartbeat(
    input: UpsertHeartbeatInput,
  ): Promise<UpsertHeartbeatResult> {
    this.logger.info('Upserting plugin install heartbeat', {
      marketplaceId: input.marketplaceId,
      pluginSlug: input.pluginSlug,
      scope: input.scope,
    });

    try {
      const identityKey = computeIdentityKey(
        input.userId,
        input.anonymousIdHash,
      );
      const repoKey = computeRepoKey(input.scope, input.repoRemoteUrl);

      if (input.userId) {
        return await this.upsertAttributedHeartbeat(
          input,
          identityKey,
          repoKey,
        );
      } else {
        return await this.upsertAnonymousHeartbeat(input, identityKey, repoKey);
      }
    } catch (error) {
      this.logger.error('Failed to upsert plugin install heartbeat', {
        marketplaceId: input.marketplaceId,
        pluginSlug: input.pluginSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listByMarketplace(
    marketplaceId: MarketplaceId,
  ): Promise<PluginInstallation[]> {
    this.logger.info('Listing plugin installations by marketplace', {
      marketplaceId,
    });

    try {
      const installations = await this.repository
        .createQueryBuilder('installation')
        .where('installation.marketplaceId = :marketplaceId', { marketplaceId })
        .orderBy('installation.createdAt', 'DESC')
        .getMany();

      this.logger.info('Plugin installations fetched by marketplace', {
        marketplaceId,
        count: installations.length,
      });
      return installations;
    } catch (error) {
      this.logger.error('Failed to list plugin installations by marketplace', {
        marketplaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async upsertAttributedHeartbeat(
    input: UpsertHeartbeatInput,
    identityKey: string,
    repoKey: string,
  ): Promise<UpsertHeartbeatResult> {
    // Look for existing attributed row for this userId
    const attributedRow = await this.findUniqueRow(
      input.marketplaceId,
      input.pluginSlug,
      input.scope,
      identityKey, // userId
      repoKey,
    );

    // Look for existing anonymous row (upgrade candidate)
    const anonymousKey = input.anonymousIdHash ?? '';
    const anonymousRow =
      anonymousKey !== identityKey && anonymousKey !== ''
        ? await this.findUniqueRow(
            input.marketplaceId,
            input.pluginSlug,
            input.scope,
            anonymousKey,
            repoKey,
          )
        : null;

    if (attributedRow && anonymousRow) {
      // Edge case 1: both attributed + anonymous rows exist — merge them
      return await this.mergeRows(attributedRow, anonymousRow, input);
    }

    if (!attributedRow && anonymousRow) {
      // Upgrade: anonymous → attributed in place
      return await this.upgradeAnonymousRow(anonymousRow, input, identityKey);
    }

    if (attributedRow) {
      // Normal: bump updatedAt + refresh installedVersion on existing attributed row
      await this.bumpLastSeen(
        attributedRow.id,
        input.now,
        input.installedVersion,
      );
      return {
        created: false,
        installation: {
          ...attributedRow,
          updatedAt: input.now,
          installedVersion: input.installedVersion,
        },
      };
    }

    // New: insert attributed row
    return await this.insertNewRow(input, identityKey, repoKey);
  }

  private async upsertAnonymousHeartbeat(
    input: UpsertHeartbeatInput,
    identityKey: string, // anonymousIdHash ?? ''
    repoKey: string,
  ): Promise<UpsertHeartbeatResult> {
    // Edge case 2: check whether an attributed row carries this anonymousIdHash
    if (input.anonymousIdHash) {
      const attributedRowWithSameHash = await this.repository.findOne({
        where: {
          marketplaceId: input.marketplaceId,
          pluginSlug: input.pluginSlug,
          scope: input.scope,
          repoKey,
          anonymousIdHash: input.anonymousIdHash,
          userId: Not(IsNull()),
        },
      });

      if (attributedRowWithSameHash) {
        // Bump the attributed row — don't insert a duplicate
        await this.bumpLastSeen(
          attributedRowWithSameHash.id,
          input.now,
          input.installedVersion,
        );
        return {
          created: false,
          installation: {
            ...attributedRowWithSameHash,
            updatedAt: input.now,
            installedVersion: input.installedVersion,
          },
        };
      }
    }

    // Normal anonymous upsert
    const existingRow = await this.findUniqueRow(
      input.marketplaceId,
      input.pluginSlug,
      input.scope,
      identityKey,
      repoKey,
    );

    if (existingRow) {
      await this.bumpLastSeen(
        existingRow.id,
        input.now,
        input.installedVersion,
      );
      return {
        created: false,
        installation: {
          ...existingRow,
          updatedAt: input.now,
          installedVersion: input.installedVersion,
        },
      };
    }

    return await this.insertNewRow(input, identityKey, repoKey);
  }

  private async findUniqueRow(
    marketplaceId: MarketplaceId,
    pluginSlug: string,
    scope: PluginInstallation['scope'],
    identityKey: string,
    repoKey: string,
  ): Promise<PluginInstallation | null> {
    return this.repository
      .createQueryBuilder('installation')
      .where('installation.marketplaceId = :marketplaceId', { marketplaceId })
      .andWhere('installation.pluginSlug = :pluginSlug', { pluginSlug })
      .andWhere('installation.scope = :scope', { scope })
      .andWhere('installation.identityKey = :identityKey', { identityKey })
      .andWhere('installation.repoKey = :repoKey', { repoKey })
      .getOne();
  }

  /**
   * Bump last-seen (`updatedAt`) and refresh `installedVersion` to the latest
   * value reported by this heartbeat, so a row reflects the version a consumer
   * is currently running (e.g. after they upgrade the plugin).
   */
  private async bumpLastSeen(
    id: PluginInstallationId,
    now: Date,
    installedVersion: string | null,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ updatedAt: now, installedVersion })
      .where('id = :id', { id })
      .execute();
  }

  private async insertNewRow(
    input: UpsertHeartbeatInput,
    identityKey: string,
    repoKey: string,
  ): Promise<UpsertHeartbeatResult> {
    const installation: PluginInstallation = {
      id: input.id,
      organizationId:
        input.organizationId as PluginInstallation['organizationId'],
      marketplaceId: input.marketplaceId,
      pluginSlug: input.pluginSlug,
      packageId: input.packageId as PluginInstallation['packageId'],
      installedVersion: input.installedVersion,
      scope: input.scope,
      userId: input.userId as PluginInstallation['userId'],
      anonymousIdHash: input.anonymousIdHash,
      anonymousEmailMasked: input.anonymousEmailMasked,
      identityKey,
      repoRemoteUrl: computeRepoRemoteUrl(input.scope, input.repoRemoteUrl),
      repoKey,
      // createdAt = first-seen, updatedAt = last-seen — both managed here.
      createdAt: input.now,
      updatedAt: input.now,
      // Soft-delete is managed by TypeORM / DB defaults
      deletedAt: null,
      deletedBy: null,
    };

    const saved = await this.repository.save(installation);
    return { created: true, installation: saved };
  }

  private async upgradeAnonymousRow(
    anonymousRow: PluginInstallation,
    input: UpsertHeartbeatInput,
    newIdentityKey: string, // userId (the new attributed key)
  ): Promise<UpsertHeartbeatResult> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        userId: input.userId as PluginInstallation['userId'],
        identityKey: newIdentityKey,
        anonymousIdHash: input.anonymousIdHash,
        anonymousEmailMasked: input.anonymousEmailMasked,
        installedVersion: input.installedVersion,
        updatedAt: input.now,
      })
      .where('id = :id', { id: anonymousRow.id })
      .execute();

    const upgraded: PluginInstallation = {
      ...anonymousRow,
      userId: input.userId as PluginInstallation['userId'],
      identityKey: newIdentityKey,
      installedVersion: input.installedVersion,
      updatedAt: input.now,
    };
    // Upgrade does not count as a "new creation" — it's a promotion
    return { created: false, installation: upgraded };
  }

  private async mergeRows(
    attributedRow: PluginInstallation,
    anonymousRow: PluginInstallation,
    input: UpsertHeartbeatInput,
  ): Promise<UpsertHeartbeatResult> {
    // Keep earliest createdAt (first-seen), latest updatedAt (last-seen)
    const mergedCreatedAt =
      attributedRow.createdAt <= anonymousRow.createdAt
        ? attributedRow.createdAt
        : anonymousRow.createdAt;

    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        createdAt: mergedCreatedAt,
        updatedAt: input.now,
        installedVersion: input.installedVersion,
      })
      .where('id = :id', { id: attributedRow.id })
      .execute();

    // Hard-delete the anonymous row (it's a duplicate)
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id: anonymousRow.id })
      .execute();

    const merged: PluginInstallation = {
      ...attributedRow,
      createdAt: mergedCreatedAt,
      updatedAt: input.now,
      installedVersion: input.installedVersion,
    };
    return { created: false, installation: merged };
  }
}
