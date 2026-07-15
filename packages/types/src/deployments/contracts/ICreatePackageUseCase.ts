import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package } from '../Package';
import { SpaceId } from '../../spaces/SpaceId';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';

export type CreatePackageCommand = PackmindCommand & {
  spaceId: SpaceId;
  name: string;
  description: string;
  recipeIds: CommandId[];
  standardIds: StandardId[];
  skillIds?: SkillId[];
};

export type CreatePackageResponse = {
  package: Package;
};

export type ICreatePackageUseCase = IUseCase<
  CreatePackageCommand,
  CreatePackageResponse
>;
