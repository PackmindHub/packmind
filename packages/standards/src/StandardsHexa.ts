import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  IDeploymentPort,
  IStandardsPort,
  PackmindLogger,
  ListStandardsBySpaceCommand,
  GetStandardByIdCommand,
  UpdateStandardCommand,
  ListStandardsBySpaceResponse,
  GetStandardByIdResponse,
} from '@packmind/shared';
import type { ILinterPort } from '@packmind/shared';
import { StandardsHexaFactory } from './StandardsHexaFactory';
import { Standard, StandardId } from './domain/entities/Standard';
import { StandardVersion } from './domain/entities/StandardVersion';
import { Rule } from './domain/entities/Rule';
import { RuleExample } from './domain/entities/RuleExample';
import { OrganizationId, UserId } from '@packmind/accounts';
import { SpaceId } from '@packmind/shared/types';
import { GitHexa } from '@packmind/git';
import { StandardVersionId } from './domain/entities';
import {
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from './domain/useCases';
import { StandardsAdapter } from './application/useCases/StandardsAdapter';

const origin = 'StandardsHexa';

/**
 * StandardsHexa - Facade for the Standards domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for standards-related functionality.
 * It holds the StandardsHexaFactory instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - StandardsHexaFactory: Handles dependency injection and service instantiation
 * - StandardsHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Also integrates with GitHexa for git-related standards operations.
 */
export class StandardsHexa extends BaseHexa {
  private readonly hexa: StandardsHexaFactory;
  private standardsAdapter?: IStandardsPort;
  private isInitialized = false;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);
    this.logger.info('Constructing StandardsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      const gitHexa = registry.get(GitHexa);

      // Get LinterHexa adapter for ILinterPort (lazy DI per DDD standard)
      // Use getByName to avoid circular dependency at build time
      let linterPort: ILinterPort | undefined;
      try {
        const linterHexa = registry.getByName<
          BaseHexa & { getLinterAdapter: () => ILinterPort }
        >('LinterHexa');
        if (linterHexa && typeof linterHexa.getLinterAdapter === 'function') {
          linterPort = linterHexa.getLinterAdapter();
          this.logger.info('LinterAdapter retrieved from LinterHexa');
        }
      } catch (error) {
        this.logger.warn('LinterHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
        linterPort = undefined;
      }

      // Initialize the hexagon with the shared DataSource
      this.hexa = new StandardsHexaFactory(
        dataSource,
        gitHexa,
        registry,
        this.logger,
        linterPort,
      );
      this.logger.info('StandardsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction.
   * This initializes delayed jobs and async dependencies.
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('StandardsHexa already initialized');
      return;
    }

    this.logger.info('Initializing StandardsHexa (async phase)');

    try {
      await this.hexa.initialize();
      this.standardsAdapter = new StandardsAdapter(this.hexa);
      this.isInitialized = true;
      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getStandardsAdapter(): IStandardsPort {
    if (!this.standardsAdapter) {
      throw new Error(
        'StandardsHexa not initialized. Call initialize() before using.',
      );
    }
    return this.standardsAdapter;
  }

  /**
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'StandardsHexa not initialized. Call initialize() before using.',
      );
    }
  }

  /**
   * Set the deployments query adapter for accessing deployment data
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.hexa.setDeploymentsQueryAdapter(adapter);
  }

  public setLinterAdapter(adapter: ILinterPort): void {
    this.hexa.setLinterAdapter(adapter);
  }

  /**
   * Destroys the StandardsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying StandardsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('StandardsHexa destroyed');
  }

  // ===========================
  // CORE STANDARD MANAGEMENT
  // ===========================

  /**
   * Create a new standard with initial content
   */
  public async createStandard(params: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }): Promise<Standard> {
    this.ensureInitialized();
    return this.hexa.useCases.createStandard(params);
  }

  /**
   * Create a new standard with rules and examples in a single operation
   */
  public async createStandardWithExamples(params: {
    name: string;
    description: string;
    summary: string | null;
    rules: import('@packmind/shared').RuleWithExamples[];
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
    spaceId: SpaceId | null;
  }): Promise<Standard> {
    this.ensureInitialized();
    return this.hexa.useCases.createStandardWithExamples(params);
  }

  /**
   * Update an existing standard with new content
   */
  public async updateStandard(
    command: UpdateStandardCommand,
  ): Promise<Standard> {
    this.ensureInitialized();
    return this.hexa.useCases.updateStandard(command);
  }

  /**
   * Add a new rule to an existing standard
   */
  public async addRuleToStandard(params: {
    standardSlug: string;
    ruleContent: string;
    organizationId: OrganizationId;
    userId: UserId;
  }): Promise<StandardVersion> {
    this.ensureInitialized();
    return this.hexa.useCases.addRuleToStandard(params);
  }

  /**
   * Create a new example for a rule
   */
  public async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    this.ensureInitialized();
    return this.hexa.useCases.createRuleExample(command);
  }

  /**
   * Get all examples for a rule
   */
  public async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    this.ensureInitialized();
    return this.hexa.useCases.getRuleExamples(command);
  }

  /**
   * Update an existing rule example
   */
  public async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    this.ensureInitialized();
    return this.hexa.useCases.updateRuleExample(command);
  }

  /**
   * Delete a rule example
   */
  public async deleteRuleExample(
    command: DeleteRuleExampleCommand,
  ): Promise<void> {
    this.ensureInitialized();
    return this.hexa.useCases.deleteRuleExample(command);
  }

  /**
   * Get a standard by its ID
   */
  public async getStandardById(
    command: GetStandardByIdCommand,
  ): Promise<GetStandardByIdResponse> {
    this.ensureInitialized();
    return this.hexa.useCases.getStandardById(command);
  }

  /**
   * Find a standard by its slug within an organization
   */
  public async findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null> {
    this.ensureInitialized();
    return this.hexa.useCases.findStandardBySlug(slug, organizationId);
  }

  /**
   * List all standards for a space (includes space standards + org standards without spaceId)
   */
  public async listStandardsBySpace(
    command: ListStandardsBySpaceCommand,
  ): Promise<ListStandardsBySpaceResponse> {
    this.ensureInitialized();
    return this.hexa.useCases.listStandardsBySpace(command);
  }

  // ===========================
  // STANDARD VERSION MANAGEMENT
  // ===========================

  /**
   * List all versions of a standard
   */
  public async listStandardVersions(
    standardId: StandardId,
  ): Promise<StandardVersion[]> {
    this.ensureInitialized();
    return this.hexa.useCases.listStandardVersions(standardId);
  }

  /**
   * Get a specific version of a standard
   */
  public async getStandardVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null> {
    this.ensureInitialized();
    return this.hexa.useCases.getStandardVersion(standardId, version);
  }

  /**
   * Get rules for a standard (from latest version)
   */
  public async getRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    this.ensureInitialized();
    return this.hexa.useCases.getRulesByStandardId(standardId);
  }

  /**
   * Get the latest version of a standard
   */
  public async getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    this.ensureInitialized();
    return this.hexa.useCases.getLatestStandardVersion(standardId);
  }

  /**
   * Get a standard version by its ID
   */
  public async getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null> {
    this.ensureInitialized();
    return this.hexa.useCases.getStandardVersionById(versionId);
  }

  // ===========================
  // STANDARD DELETION
  // ===========================

  /**
   * Delete a standard and all its versions
   */
  public async deleteStandard(
    standardId: StandardId,
    userId: UserId,
  ): Promise<void> {
    this.ensureInitialized();
    return this.hexa.useCases.deleteStandard(standardId, userId);
  }

  /**
   * Delete multiple standards in batch
   */
  public async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    this.ensureInitialized();
    return this.hexa.useCases.deleteStandardsBatch(standardIds, userId);
  }
}
