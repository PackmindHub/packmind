import { DistributedPackageId } from './DistributedPackageId';
import { DistributionId } from './DistributionId';
import { Package, PackageId } from './Package';
import { StandardVersion } from '../standards/StandardVersion';
import { RecipeVersion } from '../recipes/RecipeVersion';
import type { Distribution } from './Distribution';
import { DistributionOperation } from './DistributionOperation';

export type DistributedPackage = {
  id: DistributedPackageId;
  distributionId: DistributionId;
  packageId: PackageId;
  standardVersions: StandardVersion[];
  recipeVersions: RecipeVersion[];
  operation: DistributionOperation; // Required - 'add' or 'remove'
  package?: Package; // Optional - loaded via relation
  distribution?: Distribution; // Optional - inverse side of relation
};
