import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type UploadSkillFileInput = {
  path: string;
  content: string;
  permissions: string;
  isBase64: boolean;
};

export type UploadSkillCommand = PackmindCommand & {
  files: UploadSkillFileInput[];
  spaceId: string;
};

export type UploadSkillResponse = {
  skill: Skill;
  versionCreated: boolean;
};

export type IUploadSkillUseCase = IUseCase<
  UploadSkillCommand,
  UploadSkillResponse
>;
