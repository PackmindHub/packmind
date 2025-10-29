import { Gateway, IUseCase, PackmindCommand, RuleId } from '@packmind/shared';

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
};

export type GetActiveDetectionProgramsForRule = IUseCase<
  GetActiveDetectionProgramsForRuleCommand,
  GetActiveDetectionProgramsForRuleResult
>;

export interface IPackmindGateway {
  listExecutionPrograms: Gateway<ListDetectionPrograms>;
  getDraftDetectionProgramsForRule: Gateway<GetDraftDetectionProgramsForRule>;
  getActiveDetectionProgramsForRule: Gateway<GetActiveDetectionProgramsForRule>;
}
