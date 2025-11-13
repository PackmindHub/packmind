import { Package, PackageId, SpaceId } from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IPackageRepository extends IRepository<Package> {
  findBySpaceId(spaceId: SpaceId): Promise<Package[]>;
  findById(id: PackageId): Promise<Package | null>;
}
