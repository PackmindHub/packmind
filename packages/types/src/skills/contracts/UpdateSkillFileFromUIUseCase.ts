import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { SkillId } from '../SkillId';
import { SkillVersion } from '../SkillVersion';

export type UpdateSkillFileFromUICommand = SpaceMemberCommand & {
  skillId: SkillId;
  filePath: string;
  content: string;
};

export type UpdateSkillFileFromUIResponse = {
  skillVersion: SkillVersion | null;
  versionCreated: boolean;
};

export type IUpdateSkillFileFromUIUseCase = IUseCase<
  UpdateSkillFileFromUICommand,
  UpdateSkillFileFromUIResponse
>;
