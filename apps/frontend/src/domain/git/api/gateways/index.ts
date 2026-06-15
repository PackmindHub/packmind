import { IRepositoryGateway } from './IRepositoryGateway';
import { RepositoryGatewayApi } from './RepositoryGatewayApi';
import { IGitProviderGateway } from './IGitProviderGateway';
import { GitProviderGatewayApi } from './GitProviderGatewayApi';

export const repositoryGateway: IRepositoryGateway = new RepositoryGatewayApi();
export const gitProviderGateway: IGitProviderGateway =
  new GitProviderGatewayApi();
