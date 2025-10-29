import {
  Standard,
  StandardVersion,
  StandardId,
  StandardVersionId,
  Rule,
  NewGateway,
  IListStandardsBySpaceUseCase,
  IGetStandardByIdUseCase,
  SpaceId,
  OrganizationId,
} from '@packmind/shared/types';
import { GitRepoId } from '@packmind/git/types';

export interface IStandardsGateway {
  getStandards: NewGateway<IListStandardsBySpaceUseCase>;
  getStandardById: NewGateway<IGetStandardByIdUseCase>;
  getVersionsById(id: StandardId): Promise<StandardVersion[]>;
  getRulesByStandardId(id: StandardId): Promise<Rule[]>;
  deployStandardsToGit(
    standardVersionIds: StandardVersionId[],
    repositoryIds: GitRepoId[],
  ): Promise<void>;
  createStandard(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
  ): Promise<Standard>;
  updateStandard(
    organizationId: OrganizationId,
    spaceId: SpaceId,
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
