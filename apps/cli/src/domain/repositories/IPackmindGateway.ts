import {
  Gateway,
  PublicGateway,
  IUseCase,
  PackmindCommand,
  RuleId,
  IPullContentUseCase,
} from '@packmind/types';
import { IListPackagesUseCase } from '../useCases/IListPackagesUseCase';
import { IGetPackageSummaryUseCase } from '../useCases/IGetPackageSummaryUseCase';

// MCP Token types
export type GetMcpTokenCommand = PackmindCommand;

export type GetMcpTokenResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type IGetMcpTokenUseCase = IUseCase<
  GetMcpTokenCommand,
  GetMcpTokenResult
>;

// MCP URL types
export type GetMcpUrlCommand = PackmindCommand;

export type GetMcpUrlResult = {
  url: string;
};

export type IGetMcpUrlUseCase = IUseCase<GetMcpUrlCommand, GetMcpUrlResult>;

// Waiting for the standards hexa to expose the use case
export type ListDetectionProgramsCommand = PackmindCommand & {
  gitRemoteUrl: string;
  branches: string[];
};
export type ListDetectionProgramsResult = {
  targets: {
    name: string;
    path: string;
    standards: {
      name: string;
      slug: string;
      scope: string[];
      rules: {
        content: string;
        activeDetectionPrograms: {
          language: string;
          detectionProgram: {
            mode: string;
            code: string;
            sourceCodeState: 'AST' | 'RAW';
          };
        }[];
      }[];
    }[];
  }[];
};

export type ListDetectionPrograms = IUseCase<
  ListDetectionProgramsCommand,
  ListDetectionProgramsResult
>;

export type GetDraftDetectionProgramsForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type GetDraftDetectionProgramsForRuleResult = {
  programs: {
    language: string;
    code: string;
    mode: string;
    sourceCodeState: 'AST' | 'RAW';
  }[];
  ruleContent: string;
  standardSlug: string;
  scope: string | null;
};

export type GetDraftDetectionProgramsForRule = IUseCase<
  GetDraftDetectionProgramsForRuleCommand,
  GetDraftDetectionProgramsForRuleResult
>;

export type GetActiveDetectionProgramsForRuleCommand = PackmindCommand & {
  standardSlug: string;
  ruleId: RuleId;
  language?: string;
};

export type GetActiveDetectionProgramsForRuleResult = {
  programs: {
    language: string;
    code: string;
    mode: string;
    sourceCodeState: 'AST' | 'RAW';
  }[];
  ruleContent: string;
  standardSlug: string;
  scope: string | null;
};

export type GetActiveDetectionProgramsForRule = IUseCase<
  GetActiveDetectionProgramsForRuleCommand,
  GetActiveDetectionProgramsForRuleResult
>;

// Waiting for the linter hexa to expose the use case
export type GetDetectionProgramsForPackagesCommand = PackmindCommand & {
  packagesSlugs: string[];
};

export type GetDetectionProgramsForPackagesResult = {
  targets: {
    name: string;
    path: string;
    standards: {
      name: string;
      slug: string;
      scope: string[];
      rules: {
        content: string;
        activeDetectionPrograms: {
          language: string;
          detectionProgram: {
            mode: string;
            code: string;
            sourceCodeState: 'AST' | 'RAW';
          };
        }[];
      }[];
    }[];
  }[];
};

export type GetDetectionProgramsForPackages = IUseCase<
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResult
>;

// Notify Distribution types
export type NotifyDistributionCommand = {
  distributedPackages: string[];
  gitRemoteUrl: string;
  gitBranch: string;
  relativePath: string;
};

export type NotifyDistributionResult = {
  deploymentId: string;
};

export type NotifyDistributionGateway = (
  command: NotifyDistributionCommand,
) => Promise<NotifyDistributionResult>;

// Get Default Skills types
export type GetDefaultSkillsCommand = PackmindCommand;

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

// Standard creation types (atomic)
export type CreateStandardInSpaceCommand = {
  name: string;
  description: string;
  scope: string;
  rules: Array<{
    content: string;
    examples?: {
      language: string;
      positive: string;
      negative: string;
    };
  }>;
};

export type CreateStandardInSpaceResult = {
  id: string;
  name: string;
};

export type RuleWithId = {
  id: string;
  content: string;
};

export type RuleExample = {
  language: string;
  positive: string;
  negative: string;
};

// Global space type (used by createCommand)
export type GetGlobalSpaceResult = {
  id: string;
  slug: string;
};

// Global space type (used by createCommand)
export type GetGlobalSpaceResult = {
  id: string;
  slug: string;
};

// Create command types
export type CreateCommandCommand = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
};

export type CreateCommandResult = {
  id: string;
  name: string;
  slug: string;
};

export interface IPackmindGateway {
  listExecutionPrograms: Gateway<ListDetectionPrograms>;
  getDraftDetectionProgramsForRule: Gateway<GetDraftDetectionProgramsForRule>;
  getActiveDetectionProgramsForRule: Gateway<GetActiveDetectionProgramsForRule>;
  getDetectionProgramsForPackages: Gateway<GetDetectionProgramsForPackages>;
  getPullData: Gateway<IPullContentUseCase>;
  listPackages: PublicGateway<IListPackagesUseCase>;
  getPackageSummary: PublicGateway<IGetPackageSummaryUseCase>;
  getMcpToken: Gateway<IGetMcpTokenUseCase>;
  getMcpUrl: Gateway<IGetMcpUrlUseCase>;
  notifyDistribution: NotifyDistributionGateway;
  uploadSkill: Gateway<IUploadSkillUseCase>;
  getDefaultSkills: Gateway<IGetDefaultSkillsUseCase>;

  // Atomic gateway for getGlobalSpace (used by createCommand and createStandard)
  getGlobalSpace(): Promise<GetGlobalSpaceResult>;

  // Atomic gateways for standard creation
  createStandardInSpace(
    spaceId: string,
    data: CreateStandardInSpaceCommand,
  ): Promise<CreateStandardInSpaceResult>;

  getRulesForStandard(
    spaceId: string,
    standardId: string,
  ): Promise<RuleWithId[]>;

  addExampleToRule(
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: RuleExample,
  ): Promise<void>;

  // Atomic gateway for command creation
  createCommand(
    spaceId: string,
    data: CreateCommandCommand,
  ): Promise<CreateCommandResult>;
}
