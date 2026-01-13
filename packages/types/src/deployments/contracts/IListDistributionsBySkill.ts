import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillId } from '../../skills/SkillId';

export type ListDistributionsBySkillCommand = PackmindCommand & {
  skillId: SkillId;
};

export type IListDistributionsBySkill = IUseCase<
  ListDistributionsBySkillCommand,
  Distribution[]
>;
