import { IPublicUseCase } from '@packmind/types';

export type UploadSkillCommand = {
  skillPath: string; // local directory path
};

export type UploadSkillResult = {
  skillId: string;
  name: string;
  version: number;
  isNewSkill: boolean;
  versionCreated: boolean;
  fileCount: number;
  totalSize: number;
};

export type IUploadSkillUseCase = IPublicUseCase<
  UploadSkillCommand,
  UploadSkillResult
>;
