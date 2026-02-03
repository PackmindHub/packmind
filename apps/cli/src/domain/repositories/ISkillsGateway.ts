import { Gateway, IUseCase, PackmindCommand } from '@packmind/types';

// Get Default Skills types
export type GetDefaultSkillsCommand = PackmindCommand & {
  cliVersion?: string;
  includeBeta?: boolean;
};

export type GetDefaultSkillsResult = {
  fileUpdates: {
    createOrUpdate: Array<{
      path: string;
      content: string;
    }>;
    delete: Array<{
      path: string;
    }>;
  };
};

export type IGetDefaultSkillsUseCase = IUseCase<
  GetDefaultSkillsCommand,
  GetDefaultSkillsResult
>;

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

// List Skills types
export type ListedSkill = {
  slug: string;
  name: string;
  description: string;
};

export type ListSkillsResult = ListedSkill[];

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  getDefaults: Gateway<IGetDefaultSkillsUseCase>;
  list(): Promise<ListSkillsResult>;
}
