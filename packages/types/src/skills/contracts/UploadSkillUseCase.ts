import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type UploadSkillFileInput = {
  path: string;
  content: string;
  permissions: string;
};

export type UploadSkillCommand = PackmindCommand & {
  spaceId: string;
  files: UploadSkillFileInput[];
};

export type UploadSkillResponse = Skill;

export type IUploadSkillUseCase = IUseCase<
  UploadSkillCommand,
  UploadSkillResponse
>;
