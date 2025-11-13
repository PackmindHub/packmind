import { Repository } from 'typeorm';
import { Package, PackageId, SpaceId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { PackageSchema } from '../schemas/PackageSchema';

const origin = 'PackageRepository';

export class PackageRepository
  extends AbstractRepository<Package>
  implements IPackageRepository
{
  constructor(
    repository: Repository<Package> = localDataSource.getRepository<Package>(
      PackageSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('package', repository, logger, PackageSchema);
    this.logger.info('PackageRepository initialized');
  }

  protected override loggableEntity(pkg: Package): Partial<Package> {
    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      spaceId: pkg.spaceId,
    };
  }

  async findBySpaceId(spaceId: SpaceId): Promise<Package[]> {
    this.logger.info('Finding packages by space ID', {
      spaceId,
    });

    try {
      const packages = await this.repository
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.recipes', 'recipes')
        .leftJoinAndSelect('package.standards', 'standards')
        .where('package.spaceId = :spaceId', { spaceId })
        .orderBy('package.createdAt', 'DESC')
        .getMany();

      this.logger.info('Packages found by space ID successfully', {
        spaceId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to find packages by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(id: PackageId): Promise<Package | null> {
    this.logger.info('Finding package by ID', { packageId: id });

    try {
      const pkg = await this.repository
        .createQueryBuilder('package')
        .leftJoinAndSelect('package.recipes', 'recipes')
        .leftJoinAndSelect('package.standards', 'standards')
        .where('package.id = :id', { id })
        .getOne();

      if (!pkg) {
        this.logger.info('Package not found', { packageId: id });
        return null;
      }

      this.logger.info('Package found by ID successfully', {
        packageId: id,
      });

      return pkg;
    } catch (error) {
      this.logger.error('Failed to find package by ID', {
        packageId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
