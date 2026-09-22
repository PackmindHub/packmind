import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  PackageId,
  PackageReleaseDetail,
  PackageReleaseEntry,
} from '@packmind/types';
import {
  IPackageReleaseRepository,
  PackageReleaseVersionIds,
} from '../../domain/repositories/IPackageReleaseRepository';

const origin = 'PackageReleaseService';

export class PackageReleaseService {
  constructor(
    private readonly packageReleaseRepository: IPackageReleaseRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('PackageReleaseService initialized');
  }

  /**
   * Writes the release and its pinned versions in one transaction.
   *
   * A unique violation propagates unchanged: translating it into a refusal is
   * the use case's business.
   */
  async createRelease(
    release: PackageReleaseEntry,
    versions: PackageReleaseVersionIds,
  ): Promise<PackageReleaseEntry> {
    this.logger.info('Creating package release', {
      packageId: release.packageId,
      version: release.version,
      recipeCount: versions.recipeVersionIds.length,
      standardCount: versions.standardVersionIds.length,
      skillCount: versions.skillVersionIds.length,
    });

    try {
      const created = await this.packageReleaseRepository.createWithVersions(
        release,
        versions,
      );

      this.logger.info('Package release created successfully', {
        packageReleaseId: created.id,
        packageId: created.packageId,
        version: created.version,
      });

      return created;
    } catch (error) {
      this.logger.error('Failed to create package release', {
        packageId: release.packageId,
        version: release.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unordered: `0.10.0` sorts below `0.9.0` as a string, so callers order by
   * the parsed triple.
   */
  async listReleases(packageId: PackageId): Promise<PackageReleaseEntry[]> {
    this.logger.info('Listing package releases', { packageId });

    try {
      const releases =
        await this.packageReleaseRepository.findByPackageId(packageId);

      this.logger.info('Package releases listed successfully', {
        packageId,
        count: releases.length,
      });

      return releases;
    } catch (error) {
      this.logger.error('Failed to list package releases', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByVersion(
    packageId: PackageId,
    version: string,
  ): Promise<PackageReleaseDetail | null> {
    this.logger.info('Finding package release by version', {
      packageId,
      version,
    });

    try {
      return await this.packageReleaseRepository.findByPackageIdAndVersion(
        packageId,
        version,
      );
    } catch (error) {
      this.logger.error('Failed to find package release by version', {
        packageId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
