import { IRepositoryGateway } from './IRepositoryGateway';
import { RepositoryGatewayApi } from './RepositoryGatewayApi';
import { IGitProviderGateway } from './IGitProviderGateway';
import { GitProviderGatewayApi } from './GitProviderGatewayApi';
import { IGitGateway } from './IGitGateway';
import { GitGatewayApi } from './GitGatewayApi';
import { IGitHubAppGateway } from './IGitHubAppGateway';
import { GitHubAppGatewayApi } from './GitHubAppGatewayApi';

export const repositoryGateway: IRepositoryGateway = new RepositoryGatewayApi();
export const gitProviderGateway: IGitProviderGateway =
  new GitProviderGatewayApi();
export const gitGateway: IGitGateway = new GitGatewayApi();
export const gitHubAppGateway: IGitHubAppGateway = new GitHubAppGatewayApi();
