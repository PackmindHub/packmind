import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';

export type AddArtefactsToPackageCommand = PackmindCommand & {
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: RecipeId[];
  skillIds?: SkillId[];
};

export type AddArtefactsToPackageResponse = {
  package: Package;
  added: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  skipped: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
};

export type IAddArtefactsToPackageUseCase = IUseCase<
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse
>;
