import { IUseCase, PackmindCommand } from '../../UseCase';
import { SkillVersion } from '../SkillVersion';

export type GetSkillVersionCommand = PackmindCommand & {
  skillId: string;
  version: number;
};

export type GetSkillVersionResponse = { skillVersion: SkillVersion | null };

export type IGetSkillVersionUseCase = IUseCase<
  GetSkillVersionCommand,
  GetSkillVersionResponse
>;
