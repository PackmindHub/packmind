import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';

export type AddArtefactsToPackageCommand = PackmindCommand & {
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: RecipeId[];
};

export type AddArtefactsToPackageResponse = {
  package: Package;
};

export type IAddArtefactsToPackageUseCase = IUseCase<
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse
>;
