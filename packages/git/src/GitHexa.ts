import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  Configuration,
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { GitServices } from './application/GitServices';
import { GitAdapter } from './application/adapter/GitAdapter';

import { IGitRepoFactory } from './domain/repositories/IGitRepoFactory';
import { GitRepositories } from './infra/repositories/GitRepositories';
import {
  GithubAppMode,
  GithubTokenResolverFactory,
} from './infra/repositories/github/auth/GithubTokenResolverFactory';

const origin = 'GitHexa';

export type GitHexaOpts = BaseHexaOpts & {
  gitRepoFactory?: IGitRepoFactory;
  githubTokenResolverFactory?: GithubTokenResolverFactory;
};

const BaseGitHexaOpts: GitHexaOpts = { logger: new PackmindLogger(origin) };

export class GitHexa extends BaseHexa<GitHexaOpts, IGitPort> {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;
  private readonly adapter: GitAdapter;

  constructor(dataSource: DataSource, opts?: Partial<GitHexaOpts>) {
    super(dataSource, { ...BaseGitHexaOpts, ...opts });
    this.logger.info('Constructing GitHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.gitRepositories = new GitRepositories(
        this.dataSource,
        this.opts as GitHexaOpts,
      );
      this.gitServices = new GitServices(this.gitRepositories);

      this.logger.debug('Creating GitAdapter');
      this.adapter = new GitAdapter(this.gitServices);
      this.logger.debug('GitAdapter created successfully');

      this.logger.info('GitHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing GitHexa (adapter retrieval phase)');

    try {
      // Resolved once at bootstrap, since every use case that validates
      // credentials needs it before it runs. See GithubAppMode for what the
      // two modes mean.
      const slug = await Configuration.getConfig('GITHUB_APP_SLUG');
      const mode: GithubAppMode = slug ? 'shared' : 'on-prem';

      this.adapter.setMode(mode);

      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      const ports = {
        [IAccountsPortName]:
          registry.getAdapter<IAccountsPort>(IAccountsPortName),
        [IDeploymentPortName]:
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName),
        eventEmitterService,
        jobsService: registry.getService(JobsService),
      };

      await this.adapter.initialize(ports);

      this.logger.info('GitHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getAdapter(): IGitPort {
    return this.adapter.getPort();
  }

  public getPortName(): string {
    return IGitPortName;
  }

  /** Nothing to release yet; kept to satisfy the Hexa lifecycle. */
  public destroy(): void {
    this.logger.info('Destroying GitHexa');
    this.logger.info('GitHexa destroyed');
  }
}
