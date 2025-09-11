import {
  BaseHexa,
  HexaRegistry,
  IDeploymentPort,
  IStandardsPort,
  PackmindLogger,
  RuleId,
} from '@packmind/shared';
import { StandardsHexaFactory } from './StandardsHexaFactory';
import { Standard, StandardId } from './domain/entities/Standard';
import { StandardVersion } from './domain/entities/StandardVersion';
import { Rule } from './domain/entities/Rule';
import { RuleExample } from './domain/entities/RuleExample';
import { OrganizationId, UserId } from '@packmind/accounts';
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
  private readonly logger: PackmindLogger;
  private readonly standardsAdapter: IStandardsPort;

  constructor(
    registry: HexaRegistry,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(registry);

    this.logger = logger;
    this.logger.info('Initializing StandardsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      const gitHexa = registry.get(GitHexa);

      // Initialize the hexagon with the shared DataSource
      this.hexa = new StandardsHexaFactory(
        dataSource,
        gitHexa,
        registry,
        this.logger,
      );

      this.standardsAdapter = new StandardsAdapter(this.hexa);
      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getStandardsAdapter(): IStandardsPort {
    return this.standardsAdapter;
  }

  /**
   * Set the deployments query adapter for accessing deployment data
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.hexa.setDeploymentsQueryAdapter(adapter);
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
  }): Promise<Standard> {
    return this.hexa.useCases.createStandard(params);
  }

  /**
   * Update an existing standard with new content
   */
  public async updateStandard(params: {
    standardId: StandardId;
    name: string;
    description: string;
    rules: Array<{ id: RuleId; content: string }>;
    organizationId: OrganizationId;
    userId: UserId;
    scope: string | null;
  }): Promise<Standard> {
    return this.hexa.useCases.updateStandard(params);
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
    return this.hexa.useCases.addRuleToStandard(params);
  }

  /**
   * Create a new example for a rule
   */
  public async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.hexa.useCases.createRuleExample(command);
  }

  /**
   * Get all examples for a rule
   */
  public async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this.hexa.useCases.getRuleExamples(command);
  }

  /**
   * Update an existing rule example
   */
  public async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.hexa.useCases.updateRuleExample(command);
  }

  /**
   * Delete a rule example
   */
  public async deleteRuleExample(
    command: DeleteRuleExampleCommand,
  ): Promise<void> {
    return this.hexa.useCases.deleteRuleExample(command);
  }

  /**
   * Get a standard by its ID
   */
  public async getStandardById(id: StandardId): Promise<Standard | null> {
    return this.hexa.useCases.getStandardById(id);
  }

  /**
   * Find a standard by its slug
   */
  public async findStandardBySlug(slug: string): Promise<Standard | null> {
    return this.hexa.useCases.findStandardBySlug(slug);
  }

  /**
   * List all standards for an organization
   */
  public async listStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    return this.hexa
      .getStandardsServices()
      .getStandardService()
      .listStandardsByOrganization(organizationId);
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
    return this.hexa.useCases.listStandardVersions(standardId);
  }

  /**
   * Get a specific version of a standard
   */
  public async getStandardVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null> {
    return this.hexa.useCases.getStandardVersion(standardId, version);
  }

  /**
   * Get rules for a standard (from latest version)
   */
  public async getRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    return this.hexa.useCases.getRulesByStandardId(standardId);
  }

  /**
   * Get the latest version of a standard
   */
  public async getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    return this.hexa.useCases.getLatestStandardVersion(standardId);
  }

  /**
   * Get a standard version by its ID
   */
  public async getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null> {
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
    return this.hexa.useCases.deleteStandard(standardId, userId);
  }

  /**
   * Delete multiple standards in batch
   */
  public async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    return this.hexa.useCases.deleteStandardsBatch(standardIds, userId);
  }
}
