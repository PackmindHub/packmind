import { SkillDistributionHistoryEntry } from '../DistributionHistoryEntry';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillId } from '../../skills/SkillId';

export type ListDistributionsBySkillCommand = PackmindCommand & {
  skillId: SkillId;
};

export type ListDistributionsBySkillResponse = SkillDistributionHistoryEntry[];

export type IListDistributionsBySkill = IUseCase<
  ListDistributionsBySkillCommand,
  ListDistributionsBySkillResponse
>;
