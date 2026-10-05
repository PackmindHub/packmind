import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  PackageId,
  PackageRelease,
  PackageReleaseDetail,
  PackageReleaseEntry,
  PackageReleaseId,
  PinnedCommandVersion,
  parsePackageReleaseVersion,
  PinnedSkillVersion,
  PinnedStandardVersion,
  createCommandId,
  createCommandVersionId,
  createSkillId,
  createSkillVersionId,
  createStandardId,
  createStandardVersionId,
} from '@packmind/types';
import { EntityManager, Repository } from 'typeorm';
import {
  IPackageReleaseRepository,
  PackageReleaseVersionIds,
} from '../../domain/repositories/IPackageReleaseRepository';
import { PackageReleaseSchema } from '../schemas/PackageReleaseSchema';
import { PackageReleaseNotPersistedError } from '../../domain/errors/PackageReleaseNotPersistedError';

const origin = 'PackageReleaseRepository';

type PinRow = {
  id: string;
  componentId: string;
  name: string;
  version: number;
  /**
   * Which release pinned this version.
   *
   * Carried on the row because the pin reads take a list of releases rather
   * than one: the space-wide read below asks for the newest release of every
   * package at once, and three queries that each returned an unlabelled pile of
   * versions could not be put back together.
   */
  releaseId: string;
};

/**
 * Keys a flat pin read back by the release each row names, preserving the order
 * the query returned them in.
 */
function groupPins<T>(
  rows: PinRow[],
  toPin: (row: PinRow) => T,
): Map<PackageReleaseId, T[]> {
  const byRelease = new Map<PackageReleaseId, T[]>();
  for (const row of rows) {
    const releaseId = row.releaseId as PackageReleaseId;
    const pins = byRelease.get(releaseId);
    if (pins) pins.push(toPin(row));
    else byRelease.set(releaseId, [toPin(row)]);
  }
  return byRelease;
}

/**
 * The version's triple, as the three sortable columns store it.
 *
 * All three are null for a version the parser refuses, which is the only
 * reading that keeps such a row out of `findLatestByPackageIds` — exactly where
 * the in-memory pick used to drop it.
 */
function sortableVersionOf(version: string): {
  versionMajor: number | null;
  versionMinor: number | null;
  versionPatch: number | null;
} {
  const parsed = parsePackageReleaseVersion(version);
  return {
    versionMajor: parsed?.major ?? null,
    versionMinor: parsed?.minor ?? null,
    versionPatch: parsed?.patch ?? null,
  };
}

export class PackageReleaseRepository
  extends AbstractRepository<PackageRelease>
  implements IPackageReleaseRepository
{
  constructor(
    repository: Repository<PackageRelease> = localDataSource.getRepository<PackageRelease>(
      PackageReleaseSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('packageRelease', repository, PackageReleaseSchema, logger);
    this.logger.info('PackageReleaseRepository initialized');
  }

  protected override loggableEntity(
    entity: PackageRelease,
  ): Partial<PackageRelease> {
    return {
      id: entity.id,
      packageId: entity.packageId,
      version: entity.version,
    };
  }

  async createWithVersions(
    release: PackageReleaseEntry,
    versions: PackageReleaseVersionIds,
  ): Promise<PackageReleaseEntry> {
    this.logger.info('Creating package release', {
      packageId: release.packageId,
      version: release.version,
    });

    try {
      await this.repository.manager.transaction(async (manager) => {
        await manager.insert(PackageReleaseSchema, {
          ...release,
          ...sortableVersionOf(release.version),
        });

        await this.insertJoinRows(
          manager,
          'package_release_command_versions',
          'command_version_id',
          release.id,
          versions.recipeVersionIds,
        );
        await this.insertJoinRows(
          manager,
          'package_release_standard_versions',
          'standard_version_id',
          release.id,
          versions.standardVersionIds,
        );
        await this.insertJoinRows(
          manager,
          'package_release_skill_versions',
          'skill_version_id',
          release.id,
          versions.skillVersionIds,
        );
      });

      const persisted = await this.findEntry(
        release.packageId,
        release.version,
      );

      if (!persisted) {
        throw new PackageReleaseNotPersistedError(
          release.packageId,
          release.version,
        );
      }

      this.logger.info('Package release created successfully', {
        packageId: release.packageId,
        version: release.version,
      });
      return persisted;
    } catch (error) {
      this.logger.error('Failed to create package release', {
        packageId: release.packageId,
        version: release.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByPackageId(packageId: PackageId): Promise<PackageReleaseEntry[]> {
    this.logger.info('Finding package releases by package ID', { packageId });

    try {
      const releases = await this.repository
        .createQueryBuilder('packageRelease')
        .where('packageRelease.packageId = :packageId', { packageId })
        .getMany();

      this.logger.info('Package releases found by package ID successfully', {
        packageId,
        count: releases.length,
      });
      return releases;
    } catch (error) {
      this.logger.error('Failed to find package releases by package ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findLatestByPackageIds(
    packageIds: PackageId[],
  ): Promise<Map<PackageId, PackageReleaseDetail>> {
    this.logger.info('Finding the latest release of each package', {
      packageCount: packageIds.length,
    });

    if (packageIds.length === 0) return new Map();

    try {
      /*
       * One row per package, not one per release.
       *
       * `DISTINCT ON (package_id)` keeps the first row of each package in the
       * given order, and the order is the stored triple descending — never the
       * version string, under which `0.10.0` sorts below `0.9.0`. Backed by
       * `idx_package_releases_latest`, so a package with a long release history
       * costs the same as one with a single release; reading every release in
       * order to pick the newest made this read grow with the history of every
       * package a space pins.
       *
       * The `NOT NULL` is the old in-memory `if (!parsed) continue`: a version
       * the parser refuses has no triple, and still cannot be the newest
       * release of anything.
       */
      const releases = await this.repository
        .createQueryBuilder('packageRelease')
        .distinctOn(['packageRelease.packageId'])
        .where('packageRelease.packageId IN (:...packageIds)', { packageIds })
        .andWhere('packageRelease.versionMajor IS NOT NULL')
        .orderBy('packageRelease.packageId', 'ASC')
        .addOrderBy('packageRelease.versionMajor', 'DESC')
        .addOrderBy('packageRelease.versionMinor', 'DESC')
        .addOrderBy('packageRelease.versionPatch', 'DESC')
        .getMany();

      const latestByPackage = new Map<PackageId, PackageReleaseEntry>(
        releases.map((release) => [release.packageId, release]),
      );

      /*
       * Three queries for every package of the space rather than three per
       * package: this read backs the drift rail, which draws every destination
       * of a space at once.
       */
      const releaseIds = [...latestByPackage.values()].map(
        (release) => release.id,
      );
      const [recipeVersions, standardVersions, skillVersions] =
        await Promise.all([
          this.findRecipePins(releaseIds),
          this.findStandardPins(releaseIds),
          this.findSkillPins(releaseIds),
        ]);

      const details = new Map<PackageId, PackageReleaseDetail>();
      for (const [packageId, release] of latestByPackage) {
        details.set(packageId, {
          ...release,
          recipeVersions: recipeVersions.get(release.id) ?? [],
          standardVersions: standardVersions.get(release.id) ?? [],
          skillVersions: skillVersions.get(release.id) ?? [],
        });
      }

      this.logger.info('Latest releases found', { count: details.size });
      return details;
    } catch (error) {
      this.logger.error('Failed to find the latest release of each package', {
        packageCount: packageIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByPackageIdAndVersion(
    packageId: PackageId,
    version: string,
  ): Promise<PackageReleaseDetail | null> {
    this.logger.info('Finding package release by package ID and version', {
      packageId,
      version,
    });

    try {
      const release = await this.findEntry(packageId, version);

      if (!release) {
        this.logger.warn('No package release for that package and version', {
          packageId,
          version,
        });
        return null;
      }

      const [recipeVersions, standardVersions, skillVersions] =
        await Promise.all([
          this.findRecipePins([release.id]),
          this.findStandardPins([release.id]),
          this.findSkillPins([release.id]),
        ]);

      return {
        ...release,
        recipeVersions: recipeVersions.get(release.id) ?? [],
        standardVersions: standardVersions.get(release.id) ?? [],
        skillVersions: skillVersions.get(release.id) ?? [],
      };
    } catch (error) {
      this.logger.error(
        'Failed to find package release by package ID and version',
        {
          packageId,
          version,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findContentByPackageIdAndVersion(
    packageId: PackageId,
    version: string,
  ): Promise<PackageRelease | null> {
    this.logger.info('Finding package release content', { packageId, version });

    try {
      const release = await this.findEntry(packageId, version);
      if (!release) {
        return null;
      }

      const [recipeVersions, standardVersions, skillVersions] =
        await Promise.all([
          this.findPinnedVersions(release.id, 'recipeVersions'),
          this.findPinnedVersions(release.id, 'standardVersions'),
          this.findPinnedVersions(release.id, 'skillVersions'),
        ]);

      return { ...release, recipeVersions, standardVersions, skillVersions };
    } catch (error) {
      this.logger.error('Failed to find package release content', {
        packageId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * One family per statement, like the pin reads. withDeleted reaches the
   * joined versions: a component deleted since the release was cut must still
   * be distributed exactly as captured.
   */
  private async findPinnedVersions<
    F extends 'recipeVersions' | 'standardVersions' | 'skillVersions',
  >(releaseId: PackageReleaseId, family: F): Promise<PackageRelease[F]> {
    const found = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoinAndSelect(`packageRelease.${family}`, 'pinned')
      .where('packageRelease.id = :releaseId', { releaseId })
      .getOne();

    return found?.[family] ?? ([] as PackageRelease[F]);
  }

  private async findEntry(
    packageId: PackageId,
    version: string,
  ): Promise<PackageReleaseEntry | null> {
    return this.repository
      .createQueryBuilder('packageRelease')
      .where('packageRelease.packageId = :packageId', { packageId })
      .andWhere('packageRelease.version = :version', { version })
      .getOne();
  }

  private async findRecipePins(
    releaseIds: PackageReleaseId[],
  ): Promise<Map<PackageReleaseId, PinnedCommandVersion[]>> {
    if (releaseIds.length === 0) return new Map();

    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.recipeVersions', 'recipeVersion')
      .where('packageRelease.id IN (:...releaseIds)', { releaseIds })
      .select('recipeVersion.id', 'id')
      .addSelect('recipeVersion.recipeId', 'componentId')
      .addSelect('recipeVersion.name', 'name')
      .addSelect('recipeVersion.version', 'version')
      .addSelect('packageRelease.id', 'releaseId')
      .orderBy('recipeVersion.name', 'ASC')
      .addOrderBy('recipeVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return groupPins(rows, (row) => ({
      id: createCommandVersionId(row.id),
      recipeId: createCommandId(row.componentId),
      name: row.name,
      version: row.version,
    }));
  }

  private async findStandardPins(
    releaseIds: PackageReleaseId[],
  ): Promise<Map<PackageReleaseId, PinnedStandardVersion[]>> {
    if (releaseIds.length === 0) return new Map();

    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.standardVersions', 'standardVersion')
      .where('packageRelease.id IN (:...releaseIds)', { releaseIds })
      .select('standardVersion.id', 'id')
      .addSelect('standardVersion.standardId', 'componentId')
      .addSelect('standardVersion.name', 'name')
      .addSelect('standardVersion.version', 'version')
      .addSelect('packageRelease.id', 'releaseId')
      .orderBy('standardVersion.name', 'ASC')
      .addOrderBy('standardVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return groupPins(rows, (row) => ({
      id: createStandardVersionId(row.id),
      standardId: createStandardId(row.componentId),
      name: row.name,
      version: row.version,
    }));
  }

  private async findSkillPins(
    releaseIds: PackageReleaseId[],
  ): Promise<Map<PackageReleaseId, PinnedSkillVersion[]>> {
    if (releaseIds.length === 0) return new Map();

    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.skillVersions', 'skillVersion')
      .where('packageRelease.id IN (:...releaseIds)', { releaseIds })
      .select('skillVersion.id', 'id')
      .addSelect('skillVersion.skillId', 'componentId')
      .addSelect('skillVersion.name', 'name')
      .addSelect('skillVersion.version', 'version')
      .addSelect('packageRelease.id', 'releaseId')
      .orderBy('skillVersion.name', 'ASC')
      .addOrderBy('skillVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return groupPins(rows, (row) => ({
      id: createSkillVersionId(row.id),
      skillId: createSkillId(row.componentId),
      name: row.name,
      version: row.version,
    }));
  }

  private async insertJoinRows(
    manager: EntityManager,
    table: string,
    versionColumn: string,
    packageReleaseId: string,
    versionIds: string[],
  ): Promise<void> {
    if (versionIds.length === 0) {
      return;
    }

    const values = versionIds.map((versionId) => ({
      package_release_id: packageReleaseId,
      [versionColumn]: versionId,
    }));

    await manager
      .createQueryBuilder()
      .insert()
      .into(table)
      .values(values)
      .execute();
  }
}
