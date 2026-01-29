import { NewGateway, OrganizationId } from '@packmind/types';
import {
  Standard,
  StandardVersion,
  StandardId,
  StandardVersionId,
  Rule,
  IListStandardsBySpaceUseCase,
  IGetStandardByIdUseCase,
  ICreateStandardSamplesUseCase,
  SpaceId,
} from '@packmind/types';
import { GitRepoId } from '@packmind/types';

export interface IStandardsGateway {
  getStandards: NewGateway<IListStandardsBySpaceUseCase>;
  getStandardById: NewGateway<IGetStandardByIdUseCase>;
  getVersionsById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
  ): Promise<StandardVersion[]>;
  getRulesByStandardId(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
  ): Promise<Rule[]>;
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
  deleteStandard(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
  ): Promise<void>;
  deleteStandardsBatch(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardIds: StandardId[],
  ): Promise<void>;
  createStandardsFromSamples: NewGateway<ICreateStandardSamplesUseCase>;
}
