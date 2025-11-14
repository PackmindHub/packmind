import {
  Package,
  PackageId,
  PackageWithArtefacts,
  RecipeId,
  SpaceId,
  StandardId,
  OrganizationId,
} from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IPackageRepository extends IRepository<Package> {
  findBySpaceId(spaceId: SpaceId): Promise<Package[]>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Package[]>;
  findById(id: PackageId): Promise<Package | null>;
  findBySlugsWithArtefacts(slugs: string[]): Promise<PackageWithArtefacts[]>;
  addRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void>;
  addStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
  updatePackageDetails(
    packageId: PackageId,
    name: string,
    description: string,
  ): Promise<void>;
  setRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void>;
  setStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
}
