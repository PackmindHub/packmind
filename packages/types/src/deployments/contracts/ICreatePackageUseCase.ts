import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package } from '../Package';
import { SpaceId } from '../../spaces/SpaceId';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';

export type CreatePackageCommand = PackmindCommand & {
  spaceId: SpaceId;
  name: string;
  description: string;
  recipeIds: RecipeId[];
  standardIds: StandardId[];
};

export type CreatePackageResponse = {
  package: Package;
};

export type ICreatePackageUseCase = IUseCase<
  CreatePackageCommand,
  CreatePackageResponse
>;
