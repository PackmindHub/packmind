import { IBaseAdapter } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  CodingAgent,
  DeleteItem,
  DeployArtifactsForAgentsCommand,
  DeployArtifactsForAgentsResponse,
  FileModification,
  FileUpdates,
  GenerateAgentCleanupUpdatesCommand,
  GenerateAgentCleanupUpdatesResponse,
  GenerateRemovalUpdatesCommand,
  GenerateRemovalUpdatesResponse,
  ICodingAgentDeployerRegistry,
  ICodingAgentPort,
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
  RenderArtifactsCommand,
  RenderArtifactsResponse,
} from '@packmind/types';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { RenderArtifactsUseCase } from '../useCases/RenderArtifactsUseCase';

const origin = 'CodingAgentAdapter';

export class CodingAgentAdapter
  implements IBaseAdapter<ICodingAgentPort>, ICodingAgentPort
{
  private standardsPort: IStandardsPort | null = null;
  private gitPort: IGitPort | null = null;

  private _renderArtifactsUseCase!: RenderArtifactsUseCase;

  constructor(
    private readonly codingAgentRepositories: ICodingAgentRepositories,
    private readonly codingAgentServices: CodingAgentServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info(
      'CodingAgentAdapter constructed - awaiting initialization',
    );
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All ports in signature are REQUIRED.
   * Services are provided by Hexa after recreating with ports.
   */
  public async initialize(ports: {
    [IStandardsPortName]: IStandardsPort;
    [IGitPortName]: IGitPort;
  }): Promise<void> {
    this.logger.info('Initializing CodingAgentAdapter with ports and services');

    // Step 1: Set all ports
    this.standardsPort = ports[IStandardsPortName];
    this.gitPort = ports[IGitPortName];

    // Step 2: Validate all required dependencies are set
    if (!this.standardsPort || !this.gitPort) {
      throw new Error(
        'CodingAgentAdapter: Required ports/services not provided',
      );
    }

    this._renderArtifactsUseCase = new RenderArtifactsUseCase(
      this.codingAgentServices,
    );

    this.logger.info('CodingAgentAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required ports and services are set).
   */
  public isReady(): boolean {
    return (
      this.standardsPort != null &&
      this.gitPort != null &&
      this.codingAgentServices != null &&
      this.codingAgentRepositories != null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ICodingAgentPort {
    return this as ICodingAgentPort;
  }

  async renderArtifacts(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse> {
    return this._renderArtifactsUseCase.execute(command);
  }

  /**
   * @deprecated Use deployArtifactsForAgents or generateRemovalUpdatesForAgents instead
   */
  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.codingAgentRepositories.getDeployerRegistry();
  }

  async deployArtifactsForAgents(
    command: DeployArtifactsForAgentsCommand,
  ): Promise<DeployArtifactsForAgentsResponse> {
    this.logger.info('Deploying artifacts for agents', {
      agentsCount: command.codingAgents.length,
      recipesCount: command.recipeVersions.length,
      standardsCount: command.standardVersions.length,
      skillsCount: command.skillVersions.length,
    });

    const allUpdates: FileUpdates[] = [];
    const deployerRegistry = this.codingAgentRepositories.getDeployerRegistry();

    for (const agent of command.codingAgents) {
      const deployer = deployerRegistry.getDeployer(agent);
      const updates = await deployer.deployArtifacts(
        command.recipeVersions,
        command.standardVersions,
        command.skillVersions,
      );
      allUpdates.push(updates);
    }

    return this.mergeFileUpdates(allUpdates);
  }

  async generateRemovalUpdatesForAgents(
    command: GenerateRemovalUpdatesCommand,
  ): Promise<GenerateRemovalUpdatesResponse> {
    this.logger.info('Generating removal updates for agents', {
      agentsCount: command.codingAgents.length,
      removedRecipesCount: command.removed.recipeVersions.length,
      removedStandardsCount: command.removed.standardVersions.length,
      removedSkillsCount: command.removed.skillVersions.length,
    });

    const allUpdates: FileUpdates[] = [];
    const deployerRegistry = this.codingAgentRepositories.getDeployerRegistry();

    for (const agent of command.codingAgents) {
      const deployer = deployerRegistry.getDeployer(agent);
      const updates = await deployer.generateRemovalFileUpdates(
        command.removed,
        command.installed,
      );
      allUpdates.push(updates);
    }

    return this.mergeFileUpdates(allUpdates);
  }

  async generateAgentCleanupUpdatesForAgents(
    command: GenerateAgentCleanupUpdatesCommand,
  ): Promise<GenerateAgentCleanupUpdatesResponse> {
    this.logger.info('Generating agent cleanup updates for agents', {
      agentsCount: command.agents.length,
      recipesCount: command.artifacts.recipeVersions.length,
      standardsCount: command.artifacts.standardVersions.length,
      skillsCount: command.artifacts.skillVersions.length,
    });

    return this.codingAgentServices.generateAgentCleanupUpdatesForAgents(
      command.artifacts,
      command.agents,
    );
  }

  getSkillsFolderPathForAgents(
    agents: CodingAgent[],
  ): Map<CodingAgent, string | undefined> {
    const result = new Map<CodingAgent, string | undefined>();
    const deployerRegistry = this.codingAgentRepositories.getDeployerRegistry();
    for (const agent of agents) {
      const deployer = deployerRegistry.getDeployer(agent);
      result.set(agent, deployer.getSkillsFolderPath());
    }
    return result;
  }

  private mergeFileUpdates(updates: FileUpdates[]): FileUpdates {
    const merged: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    const pathMap = new Map<string, FileModification>();

    for (const update of updates) {
      for (const file of update.createOrUpdate) {
        pathMap.set(file.path, file);
      }
    }

    merged.createOrUpdate = Array.from(pathMap.values());

    const deleteMap = new Map<string, DeleteItem>();
    for (const update of updates) {
      for (const file of update.delete) {
        if (!deleteMap.has(file.path)) {
          deleteMap.set(file.path, file);
        }
      }
    }

    merged.delete = Array.from(deleteMap.values());

    return merged;
  }
}
