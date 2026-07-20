import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { SpaceId } from '../../spaces';

export type RemoveArtefactsFromPackageCommand = PackmindCommand & {
  spaceId: SpaceId;
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: CommandId[];
  skillIds?: SkillId[];
};

export type RemoveArtefactsFromPackageResponse = {
  package: Package;
  removed: {
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

export type IRemoveArtefactsFromPackageUseCase = IUseCase<
  RemoveArtefactsFromPackageCommand,
  RemoveArtefactsFromPackageResponse
>;
