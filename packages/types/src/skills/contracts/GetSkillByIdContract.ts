import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';
import { SkillId } from '../SkillId';
import { SpaceId } from '../../spaces/SpaceId';

export type GetSkillByIdCommand = PackmindCommand & {
  spaceId: SpaceId;
  skillId: SkillId;
};

export type GetSkillByIdResponse = { skill: Skill | null };

export type IGetSkillByIdUseCase = IUseCase<
  GetSkillByIdCommand,
  GetSkillByIdResponse
>;
