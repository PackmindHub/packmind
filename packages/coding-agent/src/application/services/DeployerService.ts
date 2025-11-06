import { RecipeVersion } from '@packmind/recipes';
import { StandardVersion } from '@packmind/standards';
import { GitRepo } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { Target } from '@packmind/types';
import { FileUpdates } from '@packmind/types';
import { CodingAgent } from '../../domain/CodingAgents';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';

const origin = 'DeployerService';

export class DeployerService {
  constructor(
    private readonly deployerRegistry: ICodingAgentDeployerRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

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
          const deployer = this.deployerRegistry.getDeployer(agent);
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
          const deployer = this.deployerRegistry.getDeployer(agent);
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

  private mergeFileUpdates(updates: FileUpdates[]): FileUpdates {
    this.logger.debug('Merging file updates', {
      updatesCount: updates.length,
    });

    const merged: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    const pathMap = new Map<string, string>();

    // Merge createOrUpdate - later entries override earlier ones for same path
    for (const update of updates) {
      for (const file of update.createOrUpdate) {
        pathMap.set(file.path, file.content);
      }
    }

    // Convert map back to array
    merged.createOrUpdate = Array.from(pathMap.entries()).map(
      ([path, content]) => ({
        path,
        content,
      }),
    );

    // Merge delete operations - deduplicate paths
    const deleteSet = new Set<string>();
    for (const update of updates) {
      for (const file of update.delete) {
        deleteSet.add(file.path);
      }
    }

    merged.delete = Array.from(deleteSet).map((path) => ({ path }));

    this.logger.debug('File updates merged', {
      uniqueCreateOrUpdate: merged.createOrUpdate.length,
      uniqueDelete: merged.delete.length,
    });

    return merged;
  }
}
