import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { PackageId, PackageRelease } from '@packmind/types';
import { EntityManager, Repository } from 'typeorm';
import {
  IPackageReleaseRepository,
  PackageReleaseVersionIds,
} from '../../domain/repositories/IPackageReleaseRepository';
import { PackageReleaseSchema } from '../schemas/PackageReleaseSchema';

const origin = 'PackageReleaseRepository';

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
    release: Omit<
      PackageRelease,
      'recipeVersions' | 'standardVersions' | 'skillVersions'
    >,
    versions: PackageReleaseVersionIds,
  ): Promise<PackageRelease> {
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

      const persisted = await this.findByPackageIdAndVersion(
        release.packageId,
        release.version,
      );

      if (!persisted) {
        throw new Error(
          `Package release ${release.version} vanished right after being written`,
        );
      }

      this.logger.info('Package release created successfully', {
        packageId: release.packageId,
        version: release.version,
      });
      return persisted;
    } catch (error) {
      // A unique violation lands here too, and leaves here unchanged: reading
      // it as a refusal is the caller's job.
      this.logger.error('Failed to create package release', {
        packageId: release.packageId,
        version: release.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByPackageId(packageId: PackageId): Promise<PackageRelease[]> {
    this.logger.info('Finding package releases by package ID', { packageId });

    try {
      const releases = await this.hydratedQuery()
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
  ): Promise<PackageRelease | null> {
    this.logger.info('Finding package release by package ID and version', {
      packageId,
      version,
    });

    try {
      const release = await this.hydratedQuery()
        .where('packageRelease.packageId = :packageId', { packageId })
        .andWhere('packageRelease.version = :version', { version })
        .getOne();

      if (!release) {
        this.logger.warn('No package release for that package and version', {
          packageId,
          version,
        });
      }
      return release;
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

  /**
   * All three families, with the deleted ones: a release keeps showing what it
   * pinned even once the command, standard or skill has been soft deleted.
   *
   * The order is critical: .withDeleted() must be called before the joins.
   * TypeORM bakes the soft-delete predicate into each join at the moment the
   * join is registered. If .withDeleted() is called after the joins, it has
   * no effect on them, and they will filter out deleted versions.
   */
  private hydratedQuery() {
    return this.repository
      .createQueryBuilder('packageRelease')
      .withDeleted()
      .leftJoinAndSelect('packageRelease.recipeVersions', 'recipeVersion')
      .leftJoinAndSelect('packageRelease.standardVersions', 'standardVersion')
      .leftJoinAndSelect('packageRelease.skillVersions', 'skillVersion');
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
