import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  Marketplace,
  MarketplaceDistribution,
} from '@packmind/types';
import {
  GitRepoRepository,
  GitRepoSchema,
  GitRepoService,
} from '@packmind/git';
import { DataSource, Repository } from 'typeorm';
import { DeploymentsAdapter } from './application/adapter/DeploymentsAdapter';
import { DeploymentsListener } from './application/listeners/DeploymentsListener';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { MarketplaceDescriptorParserRegistry } from './application/services/MarketplaceDescriptorParserRegistry';
import { AnthropicMarketplaceDescriptorParser } from './application/services/parsers/AnthropicMarketplaceDescriptorParser';
import { DeploymentsRepositories } from './infra/repositories/DeploymentsRepositories';
import { MarketplaceDistributionRepository } from './infra/repositories/MarketplaceDistributionRepository';
import { MarketplaceRepository } from './infra/repositories/MarketplaceRepository';
import { MarketplaceDistributionSchema } from './infra/schemas/MarketplaceDistributionSchema';
import { MarketplaceSchema } from './infra/schemas/MarketplaceSchema';

const origin = 'DeploymentsHexa';

export type DeploymentsHexaOpts = BaseHexaOpts;

/**
 * DeploymentsHexa - Facade for the Deployments domain following the Hexa pattern.
 *
 * This class serves as the main entry point for deployment functionality.
 * It handles the deployment of recipes and standards to git repositories
 * and tracks deployment history.
 */
export class DeploymentsHexa extends BaseHexa<
  DeploymentsHexaOpts,
  IDeploymentPort
> {
  private readonly repositories: DeploymentsRepositories;
  private readonly services: DeploymentsServices;
  private readonly marketplaceRepository: MarketplaceRepository;
  private readonly marketplaceDistributionRepository: MarketplaceDistributionRepository;
  private readonly marketplaceDescriptorParserRegistry: MarketplaceDescriptorParserRegistry;
  private readonly gitRepoService: GitRepoService;
  private readonly adapter: DeploymentsAdapter;
  private readonly listener: DeploymentsListener;

  constructor(
    dataSource: DataSource,
    opts: Partial<DeploymentsHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing DeploymentsHexa');

    try {
      // Initialize repositories aggregator
      this.repositories = new DeploymentsRepositories(this.dataSource);

      // Initialize services (no longer depends on GitPort)
      this.services = new DeploymentsServices(this.repositories);

      // Build the marketplace repository against MarketplaceSchema. Kept
      // outside DeploymentsRepositories for now because marketplace use
      // cases are the only consumers.
      this.marketplaceRepository = new MarketplaceRepository(
        this.dataSource.getRepository(
          MarketplaceSchema,
        ) as Repository<Marketplace>,
      );

      // Persistence for marketplace publish attempts. Wired here so the
      // publish use case + delayed job (Phase 2) can pick it up via the
      // adapter. Pure-persistence registration on its own — no adapter or
      // use-case wiring lands in this commit to honor the early-push
      // checkpoint (AC18).
      this.marketplaceDistributionRepository =
        new MarketplaceDistributionRepository(
          this.dataSource.getRepository(
            MarketplaceDistributionSchema,
          ) as Repository<MarketplaceDistribution>,
        );

      // Vendor-agnostic parser registry. New marketplace vendors plug in by
      // appending to this array — link/unlink use cases do not branch on
      // vendor.
      this.marketplaceDescriptorParserRegistry =
        new MarketplaceDescriptorParserRegistry([
          new AnthropicMarketplaceDescriptorParser(),
        ]);

      // LinkMarketplaceUseCase needs the GitRepoService for the cross-type
      // collision check (`findGitRepoIgnoringType`) and to persist the
      // marketplace-typed GitRepo. The service is constructed from the
      // GitRepoRepository (re-exported from @packmind/git so this Hexa can
      // wire it without reaching into git's internals).
      this.gitRepoService = new GitRepoService(
        new GitRepoRepository(this.dataSource.getRepository(GitRepoSchema)),
      );

      // Create adapter in constructor - ports will be set during initialize()
      this.adapter = new DeploymentsAdapter(
        this.services,
        this.repositories.getDistributionRepository(),
        this.repositories.getDistributedPackageRepository(),
        this.marketplaceRepository,
        this.marketplaceDescriptorParserRegistry,
        this.gitRepoService,
      );

      // Create listener - will be initialized during initialize()
      this.listener = new DeploymentsListener(
        this.repositories.getPackageRepository(),
      );

      this.logger.info('DeploymentsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing DeploymentsHexa (adapter retrieval phase)');

    try {
      // Get all required ports - let errors propagate
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
      const codingAgentPort =
        registry.getAdapter<ICodingAgentPort>(ICodingAgentPortName);
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const jobsService = registry.getService(JobsService);
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      // Initialize adapter with all ports
      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IRecipesPortName]: recipesPort,
        [ICodingAgentPortName]: codingAgentPort,
        [IStandardsPortName]: standardsPort,
        [ISkillsPortName]: skillsPort,
        [ISpacesPortName]: spacesPort,
        [IAccountsPortName]: accountsPort,
        jobsService,
        eventEmitterService,
      });

      // Initialize listener with event emitter service
      this.listener.initialize(eventEmitterService);

      this.logger.info('DeploymentsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the DeploymentsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying DeploymentsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('DeploymentsHexa destroyed');
  }

  /**
   * Get the Deployments adapter for cross-domain access to deployments data.
   * This adapter implements IDeploymentPort and can be injected into other domains.
   */
  public getAdapter(): IDeploymentPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IDeploymentPortName;
  }
}
