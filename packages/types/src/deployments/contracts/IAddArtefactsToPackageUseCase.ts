import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { SpaceId } from '../../spaces';

export type AddArtefactsToPackageCommand = PackmindCommand & {
  spaceId: SpaceId;
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: CommandId[];
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
