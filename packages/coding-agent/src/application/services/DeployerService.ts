import { PackmindLogger } from '@packmind/logger';
import {
  CodingAgent,
  DeleteItem,
  FileModification,
  FileUpdates,
  GitRepo,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { AGENT_FILE_PATHS } from '../../domain/AgentConfiguration';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';

const origin = 'DeployerService';

export class DeployerService {
  constructor(
    private readonly codingAgentRepositories: ICodingAgentRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  getDeployerForAgent(agent: CodingAgent) {
    return this.codingAgentRepositories
      .getDeployerRegistry()
      .getDeployer(agent);
  }

  async aggregateRecipeDeployments(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Aggregating recipe deployments', {
      recipesCount: recipeVersions.length,
      targetsCount: targets.length,
      agentsCount: codingAgents.length,
      agents: codingAgents,
    });

    const allUpdates: FileUpdates[] = [];

    // Deploy to each target
    for (const target of targets) {
      this.logger.debug('Deploying recipes for target', {
        targetId: target.id,
        targetPath: target.path,
      });

      for (const agent of codingAgents) {
        try {
          this.logger.debug('Deploying recipes for agent and target', {
            agent,
            targetId: target.id,
          });
          const deployer = this.codingAgentRepositories
            .getDeployerRegistry()
            .getDeployer(agent);
          const updates = await deployer.deployRecipes(
            recipeVersions,
            gitRepo,
            target,
          );
          allUpdates.push(updates);
          this.logger.debug(
            'Successfully deployed recipes for agent and target',
            {
              agent,
              targetId: target.id,
              createOrUpdateCount: updates.createOrUpdate.length,
              deleteCount: updates.delete.length,
            },
          );
        } catch (error) {
          this.logger.error('Failed to deploy recipes for agent and target', {
            agent,
            targetId: target.id,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }
    }

    const merged = this.mergeFileUpdates(allUpdates);
    this.logger.info('Successfully aggregated recipe deployments', {
      totalCreateOrUpdate: merged.createOrUpdate.length,
      totalDelete: merged.delete.length,
    });

    return merged;
  }

  async aggregateStandardsDeployments(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Aggregating standards deployments', {
      standardsCount: standardVersions.length,
      targetsCount: targets.length,
      agentsCount: codingAgents.length,
      agents: codingAgents,
    });

    const allUpdates: FileUpdates[] = [];

    // Deploy to each target
    for (const target of targets) {
      this.logger.debug('Deploying standards for target', {
        targetId: target.id,
        targetPath: target.path,
      });

      for (const agent of codingAgents) {
        try {
          this.logger.debug('Deploying standards for agent and target', {
            agent,
            targetId: target.id,
          });
          const deployer = this.codingAgentRepositories
            .getDeployerRegistry()
            .getDeployer(agent);
          const updates = await deployer.deployStandards(
            standardVersions,
            gitRepo,
            target,
          );
          allUpdates.push(updates);
          this.logger.debug(
            'Successfully deployed standards for agent and target',
            {
              agent,
              targetId: target.id,
              createOrUpdateCount: updates.createOrUpdate.length,
              deleteCount: updates.delete.length,
            },
          );
        } catch (error) {
          this.logger.error('Failed to deploy standards for agent and target', {
            agent,
            targetId: target.id,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }
    }

    const merged = this.mergeFileUpdates(allUpdates);
    this.logger.info('Successfully aggregated standards deployments', {
      totalCreateOrUpdate: merged.createOrUpdate.length,
      totalDelete: merged.delete.length,
    });

    return merged;
  }

  async aggregateSkillDeployments(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Aggregating skill deployments', {
      skillsCount: skillVersions.length,
      targetsCount: targets.length,
      agentsCount: codingAgents.length,
      agents: codingAgents,
    });

    const allUpdates: FileUpdates[] = [];

    // Deploy to each target
    for (const target of targets) {
      this.logger.debug('Deploying skills for target', {
        targetId: target.id,
        targetPath: target.path,
      });

      for (const agent of codingAgents) {
        try {
          this.logger.debug('Deploying skills for agent and target', {
            agent,
            targetId: target.id,
          });
          const deployer = this.codingAgentRepositories
            .getDeployerRegistry()
            .getDeployer(agent);
          const updates = await deployer.deploySkills(
            skillVersions,
            gitRepo,
            target,
          );
          allUpdates.push(updates);
          this.logger.debug(
            'Successfully deployed skills for agent and target',
            {
              agent,
              targetId: target.id,
              createOrUpdateCount: updates.createOrUpdate.length,
              deleteCount: updates.delete.length,
            },
          );
        } catch (error) {
          this.logger.error('Failed to deploy skills for agent and target', {
            agent,
            targetId: target.id,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }
    }

    const merged = this.mergeFileUpdates(allUpdates);
    this.logger.info('Successfully aggregated skill deployments', {
      totalCreateOrUpdate: merged.createOrUpdate.length,
      totalDelete: merged.delete.length,
    });

    return merged;
  }

  async aggregateArtifactRendering(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[],
    codingAgents: CodingAgent[],
    existingFiles: Map<string, string>,
  ): Promise<FileUpdates> {
    this.logger.info('Aggregating artifact rendering', {
      recipesCount: recipeVersions.length,
      standardsCount: standardVersions.length,
      skillsCount: skillVersions.length,
      agentsCount: codingAgents.length,
      agents: codingAgents,
      existingFilesCount: existingFiles.size,
    });

    const allUpdates: FileUpdates[] = [];

    for (const agent of codingAgents) {
      try {
        this.logger.debug('Rendering artifacts for agent', { agent });

        const deployer = this.codingAgentRepositories
          .getDeployerRegistry()
          .getDeployer(agent);

        const filePath = this.getFilePathForAgent(agent);
        const existingContent = existingFiles.get(filePath) ?? '';

        this.logger.debug('Retrieved existing content for agent file', {
          agent,
          filePath,
          hasExistingContent: existingContent.length > 0,
        });

        const updates = await deployer.deployArtifacts(
          recipeVersions,
          standardVersions,
          skillVersions,
        );

        allUpdates.push(updates);

        this.logger.debug('Successfully rendered artifacts for agent', {
          agent,
          createOrUpdateCount: updates.createOrUpdate.length,
          deleteCount: updates.delete.length,
        });
      } catch (error) {
        this.logger.error('Failed to render artifacts for agent', {
          agent,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    const merged = this.mergeFileUpdates(allUpdates);
    this.logger.info('Successfully aggregated artifact rendering', {
      totalCreateOrUpdate: merged.createOrUpdate.length,
      totalDelete: merged.delete.length,
    });

    return merged;
  }

  private getFilePathForAgent(agent: CodingAgent): string {
    return AGENT_FILE_PATHS[agent];
  }

  private mergeFileUpdates(updates: FileUpdates[]): FileUpdates {
    this.logger.debug('Merging file updates', {
      updatesCount: updates.length,
    });

    const merged: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    const pathMap = new Map<string, FileModification>();

    // Merge createOrUpdate - later entries override earlier ones for same path
    for (const update of updates) {
      for (const file of update.createOrUpdate) {
        pathMap.set(file.path, file);
      }
    }

    // Convert map back to array
    merged.createOrUpdate = Array.from(pathMap.values());

    // Merge delete operations - deduplicate paths while preserving type
    const deleteMap = new Map<string, DeleteItem>();
    for (const update of updates) {
      for (const file of update.delete) {
        if (!deleteMap.has(file.path)) {
          deleteMap.set(file.path, file);
        }
      }
    }

    merged.delete = Array.from(deleteMap.values());

    this.logger.debug('File updates merged', {
      uniqueCreateOrUpdate: merged.createOrUpdate.length,
      uniqueDelete: merged.delete.length,
    });

    return merged;
  }
}
