import {
  Package,
  PackageId,
  RecipeId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { IRepository } from '@packmind/types';

export interface IPackageRepository extends IRepository<Package> {
  findBySpaceId(spaceId: SpaceId): Promise<Package[]>;
  findById(id: PackageId): Promise<Package | null>;
  addRecipes(packageId: PackageId, recipeIds: RecipeId[]): Promise<void>;
  addStandards(packageId: PackageId, standardIds: StandardId[]): Promise<void>;
}
