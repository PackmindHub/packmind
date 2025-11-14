import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';

export type UpdatePackageCommand = PackmindCommand & {
  packageId: PackageId;
  name: string;
  description: string;
  recipeIds: RecipeId[];
  standardIds: StandardId[];
};

export type UpdatePackageResponse = {
  package: Package;
};

export type IUpdatePackageUseCase = IUseCase<
  UpdatePackageCommand,
  UpdatePackageResponse
>;
