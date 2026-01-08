import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillVersion } from '../SkillVersion';

export type GetLatestSkillVersionCommand = PackmindCommand & {
  skillId: string;
};

export type GetLatestSkillVersionResponse = {
  skillVersion: SkillVersion | null;
};

export type IGetLatestSkillVersionUseCase = IUseCase<
  GetLatestSkillVersionCommand,
  GetLatestSkillVersionResponse
>;
