import {
  Gateway,
  IDeployDefaultSkillsUseCase,
  IListSkillsBySpaceUseCase,
  IUseCase,
  PackmindCommand,
} from '@packmind/types';

// Upload Skill types
export type UploadSkillCommand = PackmindCommand & {
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

export type IUploadSkillUseCase = IUseCase<
  UploadSkillCommand,
  UploadSkillResult
>;

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  getDefaults: Gateway<IDeployDefaultSkillsUseCase>;
  list: Gateway<IListSkillsBySpaceUseCase>;
}
