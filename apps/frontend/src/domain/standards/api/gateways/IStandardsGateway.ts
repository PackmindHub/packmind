import {
  Standard,
  StandardVersion,
  StandardId,
  StandardVersionId,
  Rule,
} from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git/types';

export interface IStandardsGateway {
  getStandards(): Promise<Standard[]>;
  getStandardById(id: StandardId): Promise<Standard>;
  getVersionsById(id: StandardId): Promise<StandardVersion[]>;
  getRulesByStandardId(id: StandardId): Promise<Rule[]>;
  deployStandardsToGit(
    standardVersionIds: StandardVersionId[],
    repositoryIds: GitRepoId[],
  ): Promise<void>;
  createStandard(standard: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    scope?: string | null;
  }): Promise<Standard>;
  updateStandard(
    id: StandardId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
  ): Promise<Standard>;
  deleteStandard(id: StandardId): Promise<void>;
  deleteStandardsBatch(standardIds: StandardId[]): Promise<void>;
}
