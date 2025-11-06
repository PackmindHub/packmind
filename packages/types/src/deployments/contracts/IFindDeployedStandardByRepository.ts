import { StandardVersion } from '../../standards/StandardVersion';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { GitRepoId } from '../../git/GitRepoId';

export type FindDeployedStandardByRepositoryCommand = PackmindCommand & {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
};

export type FindDeployedStandardByRepositoryResponse = StandardVersion[];

export type IFindDeployedStandardByRepositoryUseCase = IUseCase<
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse
>;
