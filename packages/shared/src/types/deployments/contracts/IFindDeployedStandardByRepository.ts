import { StandardVersion } from '../../standards';
import { IUseCase, PackmindCommand } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { GitRepoId } from '../../git';

export type FindDeployedStandardByRepositoryCommand = PackmindCommand & {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
};

export type FindDeployedStandardByRepositoryResponse = StandardVersion[];

export type IFindDeployedStandardByRepositoryUseCase = IUseCase<
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse
>;
