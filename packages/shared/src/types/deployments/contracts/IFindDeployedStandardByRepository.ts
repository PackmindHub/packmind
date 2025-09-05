import { StandardVersion } from '../../standards';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts';
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
