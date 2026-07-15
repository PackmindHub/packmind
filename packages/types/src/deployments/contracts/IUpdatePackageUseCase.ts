import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SpaceId } from '../../spaces/SpaceId';
import { SkillId } from '../../skills';

export type UpdatePackageCommand = PackmindCommand & {
  packageId: PackageId;
  spaceId: SpaceId;
  name: string;
  description: string;
  recipeIds: CommandId[];
  standardIds: StandardId[];
  skillsIds: SkillId[];
};

export type UpdatePackageResponse = {
  package: Package;
};

export type IUpdatePackageUseCase = IUseCase<
  UpdatePackageCommand,
  UpdatePackageResponse
>;
