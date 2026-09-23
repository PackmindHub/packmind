import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  PackageId,
  PackageRelease,
  PackageReleaseDetail,
  PackageReleaseEntry,
  PackageReleaseId,
  PinnedCommandVersion,
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
};

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
        await manager.insert(PackageReleaseSchema, release);

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
          this.findRecipePins(release.id),
          this.findStandardPins(release.id),
          this.findSkillPins(release.id),
        ]);

      return { ...release, recipeVersions, standardVersions, skillVersions };
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
    releaseId: PackageReleaseId,
  ): Promise<PinnedCommandVersion[]> {
    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.recipeVersions', 'recipeVersion')
      .where('packageRelease.id = :releaseId', { releaseId })
      .select('recipeVersion.id', 'id')
      .addSelect('recipeVersion.recipeId', 'componentId')
      .addSelect('recipeVersion.name', 'name')
      .addSelect('recipeVersion.version', 'version')
      .orderBy('recipeVersion.name', 'ASC')
      .addOrderBy('recipeVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return rows.map((row) => ({
      id: createCommandVersionId(row.id),
      recipeId: createCommandId(row.componentId),
      name: row.name,
      version: row.version,
    }));
  }

  private async findStandardPins(
    releaseId: PackageReleaseId,
  ): Promise<PinnedStandardVersion[]> {
    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.standardVersions', 'standardVersion')
      .where('packageRelease.id = :releaseId', { releaseId })
      .select('standardVersion.id', 'id')
      .addSelect('standardVersion.standardId', 'componentId')
      .addSelect('standardVersion.name', 'name')
      .addSelect('standardVersion.version', 'version')
      .orderBy('standardVersion.name', 'ASC')
      .addOrderBy('standardVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return rows.map((row) => ({
      id: createStandardVersionId(row.id),
      standardId: createStandardId(row.componentId),
      name: row.name,
      version: row.version,
    }));
  }

  private async findSkillPins(
    releaseId: PackageReleaseId,
  ): Promise<PinnedSkillVersion[]> {
    const rows = await this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .innerJoin('packageRelease.skillVersions', 'skillVersion')
      .where('packageRelease.id = :releaseId', { releaseId })
      .select('skillVersion.id', 'id')
      .addSelect('skillVersion.skillId', 'componentId')
      .addSelect('skillVersion.name', 'name')
      .addSelect('skillVersion.version', 'version')
      .orderBy('skillVersion.name', 'ASC')
      .addOrderBy('skillVersion.id', 'ASC')
      .getRawMany<PinRow>();

    return rows.map((row) => ({
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
